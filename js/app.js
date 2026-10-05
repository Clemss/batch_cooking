import { auth, db, googleProvider, isConfigured } from './firebase.js';
import { WORKER_URL } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, orderBy, limit,
  serverTimestamp, arrayUnion, arrayRemove, deleteField,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { SEED_RECIPES } from './recipes.js';
import {
  generatePlan, rerollRecipe, buildShoppingList, groupItems, formatQty, itemLine, parseIngredientLine,
  guessCategory, slug, dayLabel, todayISO, MEAL_LABELS, DIETS, TAGS, CAT_LABEL, CATEGORIES,
} from './planner.js';

// ====================================================================
// État
// ====================================================================

const DEFAULT_SETTINGS = { people: 2, days: 5, meals: ['midi', 'soir'], recipeCount: 4, diet: 'tous' };

const state = {
  ready: false,
  user: null,
  household: null,
  plans: [],
  customRecipes: [],
  tab: 'plan',
  authMode: 'login',
  settings: { ...loadSettings(), startDate: todayISO() },
  draft: null,
  forced: new Set(),
  selectedPlanId: null,
  recipeSearch: '',
  recipeTag: 'tous',
  includePantry: false,
  busy: false,
};
let unsubs = [];

function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('mb_settings') || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}
function saveSettings() {
  try { const { startDate, ...s } = state.settings; localStorage.setItem('mb_settings', JSON.stringify(s)); } catch { /* ignore */ }
}

const uid = () => state.user?.uid;
const hid = () => state.household?.id;
let pendingName = ''; // prénom saisi à l'inscription, avant que le profil Firebase soit mis à jour
const myName = () => state.user?.displayName || pendingName || state.user?.email?.split('@')[0] || 'Moi';
const allRecipes = () => [...SEED_RECIPES, ...state.customRecipes];
const currentPlan = () => {
  const id = state.selectedPlanId || state.household?.currentPlanId;
  return state.plans.find(p => p.id === id) || state.plans[0] || null;
};
const clean = obj => JSON.parse(JSON.stringify(obj)); // retire les undefined (refusés par Firestore)

// ====================================================================
// Utilitaires UI
// ====================================================================

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

function fail(e) {
  console.error(e);
  const msg = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/invalid-email': 'E-mail invalide.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
    'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé dans Firebase Auth (voir README).',
    'permission-denied': 'Accès refusé par la base (vérifie les règles Firestore).',
  }[e?.code] || e?.message || String(e);
  toast(msg, 5000);
}

const colorFor = id => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 52%)`;
};

// ---- rendu : « doux » pendant la saisie pour ne pas perdre le focus ----
let pendingRender = false;
function isEditing() {
  const a = document.activeElement;
  return a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['checkbox', 'radio', 'submit', 'button'].includes(a.type)) || a.tagName === 'SELECT')
    && !a.dataset.live;
}
function softRender() {
  if (isEditing()) { pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => {
  if (!pendingRender) return;
  setTimeout(() => { if (pendingRender && !isEditing()) { pendingRender = false; render(); } }, 250);
});

function render() {
  pendingRender = false;
  const active = document.activeElement;
  const focusId = active?.id;
  const sel = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const scrollY = window.scrollY;

  const app = $('#app');
  if (!isConfigured) app.innerHTML = viewNotConfigured();
  else if (!state.ready) app.innerHTML = '<div class="splash">🥗</div>';
  else if (!state.user) app.innerHTML = viewAuth();
  else app.innerHTML = viewShell();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus(); if (sel) try { el.setSelectionRange(...sel); } catch { /* ignore */ } }
  }
  window.scrollTo(0, scrollY);
}

// ====================================================================
// Auth & abonnement aux données
// ====================================================================

function cleanup() { unsubs.forEach(u => u()); unsubs = []; }

if (isConfigured) {
  onAuthStateChanged(auth, async user => {
    cleanup();
    Object.assign(state, { user, household: null, plans: [], customRecipes: [], draft: null, selectedPlanId: null, ready: true });
    render();
    if (user) {
      try { await ensureHousehold(); } catch (e) { fail(e); }
    }
  });
} else {
  render();
}

async function ensureHousehold() {
  const uref = doc(db, 'users', uid());
  const snap = await getDoc(uref);
  let householdId = snap.exists() ? snap.data().householdId : null;

  if (householdId) {
    try {
      const h = await getDoc(doc(db, 'households', householdId));
      if (!h.exists() || !(h.data().members || []).includes(uid())) householdId = null;
    } catch { householdId = null; }
  }
  if (!householdId) {
    const ref = await addDoc(collection(db, 'households'), {
      name: `Foyer de ${myName()}`,
      members: [uid()],
      memberNames: { [uid()]: myName() },
      currentPlanId: null,
      createdAt: serverTimestamp(),
    });
    householdId = ref.id;
    await setDoc(uref, { householdId, email: state.user.email || '', displayName: myName() }, { merge: true });
  }
  subscribe(householdId);
}

function subscribe(householdId) {
  cleanup();
  unsubs.push(onSnapshot(doc(db, 'households', householdId), s => {
    if (!s.exists()) return;
    state.household = { id: s.id, ...s.data() };
    softRender();
  }, fail));
  unsubs.push(onSnapshot(
    query(collection(db, 'households', householdId, 'plans'), orderBy('createdAtMs', 'desc'), limit(30)),
    s => { state.plans = s.docs.map(d => ({ id: d.id, ...d.data() })); softRender(); }, fail));
  unsubs.push(onSnapshot(collection(db, 'households', householdId, 'recipes'), s => {
    state.customRecipes = s.docs.map(d => ({ ...d.data(), id: d.id, custom: true }));
    softRender();
  }, fail));
}

// ====================================================================
// Vues
// ====================================================================

function viewNotConfigured() {
  return `<div class="auth"><div class="auth-card card">
    <div class="logo">🛠️</div><h1>Presque prêt</h1>
    <p>Colle la configuration de ton projet Firebase dans <code>js/firebase-config.js</code>, puis recharge la page.</p>
    <p class="muted">Les étapes détaillées sont dans le README.</p></div></div>`;
}

function viewAuth() {
  const signup = state.authMode === 'signup';
  return `<div class="auth"><div class="auth-card">
    <div class="card">
      <div class="logo">🥗</div>
      <h1>Menu Batch</h1>
      <p class="muted">Tes menus healthy de la semaine, cuisinés en une session, avec la liste de courses partagée.</p>
      <form data-form="auth">
        ${signup ? `<label>Prénom<input type="text" name="name" id="f-name" autocomplete="given-name" required></label>` : ''}
        <label>E-mail<input type="email" name="email" id="f-email" autocomplete="email" required></label>
        <label>Mot de passe<input type="password" name="password" id="f-pass" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
        <button class="btn primary block" ${state.busy ? 'disabled' : ''}>${signup ? 'Créer mon compte' : 'Se connecter'}</button>
      </form>
      <div class="divider">ou</div>
      <button class="btn block" data-action="google">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
        Continuer avec Google
      </button>
      <p style="margin-top:16px" class="row">
        <button class="linkish" data-action="auth-toggle">${signup ? 'J\'ai déjà un compte' : 'Créer un compte'}</button>
        <span class="spacer"></span>
        ${signup ? '' : '<button class="linkish" data-action="reset-password">Mot de passe oublié ?</button>'}
      </p>
    </div>
  </div></div>`;
}

const TABS = [
  ['plan', '🪄', 'Planifier'],
  ['menu', '🍱', 'Menu'],
  ['courses', '🛒', 'Courses'],
  ['recettes', '📖', 'Recettes'],
  ['foyer', '🏠', 'Foyer'],
];

function viewShell() {
  const views = { plan: viewPlan, menu: viewMenu, courses: viewCourses, recettes: viewRecipes, foyer: viewFoyer };
  const body = state.household ? views[state.tab]() : '<div class="splash" style="height:40vh">🥗</div>';
  return `
    <header class="topbar">
      <div class="brand">🥗 Menu Batch</div>
      <div class="hh">${esc(state.household?.name || '')}</div>
      <button class="icon-btn" data-action="logout" title="Se déconnecter" aria-label="Se déconnecter">⎋</button>
    </header>
    <nav class="tabs" aria-label="Navigation">
      ${TABS.map(([id, ico, label]) => `<button data-action="tab" data-tab="${id}" class="${state.tab === id ? 'active' : ''}"><span>${ico}</span>${label}</button>`).join('')}
    </nav>
    <main class="content">${body}</main>`;
}

// ---------------- Planifier ----------------

function viewPlan() {
  const s = state.settings;
  const forced = [...state.forced].map(id => allRecipes().find(r => r.id === id)).filter(Boolean);
  return `
  <section class="card">
    <h2>Nouveau menu</h2>
    <form data-form="plan" class="grid-form">
      <label>Personnes<input type="number" name="people" id="p-people" min="1" max="12" value="${s.people}" required></label>
      <label>Jours<input type="number" name="days" id="p-days" min="1" max="14" value="${s.days}" required></label>
      <label>Recettes différentes<input type="number" name="recipeCount" id="p-count" min="1" max="10" value="${s.recipeCount}" required></label>
      <label>Premier jour<input type="date" name="startDate" id="p-start" value="${esc(s.startDate)}"></label>
      <div class="full">
        <label style="margin-bottom:6px">Repas à prévoir</label>
        <div class="chips">
          ${Object.entries(MEAL_LABELS).map(([k, l]) => `
            <label class="chip toggle ${s.meals.includes(k) ? 'on' : ''}"><input type="checkbox" name="meals" value="${k}" ${s.meals.includes(k) ? 'checked' : ''} data-change="meal-chip">${l}</label>`).join('')}
        </div>
      </div>
      <label class="full">Régime
        <select name="diet" id="p-diet">${DIETS.map(([k, l]) => `<option value="${k}" ${s.diet === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </label>
      ${forced.length ? `<div class="full"><label style="margin-bottom:6px">Recettes imposées</label><div class="chips">
        ${forced.map(r => `<span class="chip on">${esc(r.name)} <button type="button" class="icon-btn" style="padding:0 2px" data-action="unforce" data-id="${esc(r.id)}" aria-label="Retirer">✕</button></span>`).join('')}
      </div></div>` : `<p class="full muted" style="margin:0;font-size:.88rem">Astuce : dans l'onglet Recettes, ⭐ impose une recette dans le prochain menu.</p>`}
      <button class="btn primary full">🪄 Générer le menu</button>
    </form>
  </section>
  ${state.draft ? viewDraft(state.draft) : ''}`;
}

function viewDraft(d) {
  const total = d.schedule.length;
  const portions = d.recipes.reduce((a, r) => a + r.portions, 0);
  const minutes = d.recipes.reduce((a, r) => a + (r.time || 0), 0);
  return `
  <section class="card">
    <div class="row"><h2 style="margin:0">Proposition</h2><span class="spacer"></span>
      <button class="btn small ghost" data-action="regenerate">🔄 Tout regénérer</button></div>
    <p class="muted" style="margin-top:4px">Verrouille 🔒 ce qui te plaît, change le reste.</p>
    <div class="stats">
      <div class="stat"><b>${total}</b><span>repas</span></div>
      <div class="stat"><b>${d.recipes.length}</b><span>recettes à cuisiner</span></div>
      <div class="stat"><b>${portions}</b><span>portions</span></div>
      <div class="stat"><b>~${Math.round(minutes * 0.7 / 5) * 5}</b><span>min de batch*</span></div>
    </div>
    ${d.warnings.map(w => `<div class="notice">⚠️ ${esc(w)}</div>`).join('')}
    ${d.recipes.map(r => {
      const locked = state.forced.has(r.id);
      return `<div class="recipe-card ${locked ? 'locked' : ''}">
        <h3><span class="dot" style="background:${colorFor(r.id)}"></span>${esc(r.name)}</h3>
        <div class="recipe-meta">${r.meals} repas · <b>${r.portions} portions</b> · ${r.time || '?'} min · ${r.kcal ? r.kcal + ' kcal/portion · ' : ''}se garde ${r.keeps} j${r.freezable ? ' · congelable' : ''}</div>
        <div class="row">
          <button class="btn small ${locked ? 'primary' : ''}" data-action="lock" data-id="${esc(r.id)}">${locked ? '🔒 Gardée' : '🔓 Garder'}</button>
          <button class="btn small" data-action="reroll" data-id="${esc(r.id)}" ${locked ? 'disabled' : ''}>🔄 Changer</button>
        </div>
      </div>`;
    }).join('')}
    <h3 style="margin-top:18px">Planning</h3>
    ${viewSchedule(d)}
    <p class="muted" style="font-size:.8rem">* estimation en cuisinant plusieurs recettes en parallèle.</p>
    <button class="btn accent block" data-action="validate" ${state.busy ? 'disabled' : ''}>✅ Valider & créer la liste de courses</button>
  </section>`;
}

function viewSchedule(plan) {
  const byId = Object.fromEntries(plan.recipes.map(r => [r.id, r]));
  const meals = ['midi', 'soir'].filter(m => plan.settings.meals.includes(m));
  const days = [...new Set(plan.schedule.map(s => s.day))];
  const cell = s => {
    if (!s) return '<td></td>';
    const r = byId[s.recipeId];
    return `<td><span class="dot" style="background:${colorFor(s.recipeId)}"></span>${esc(r?.name || '?')}
      ${s.freeze ? `<br><span class="chip ${s.warn ? 'warn' : 'ice'} tag">${s.warn ? '⚠️ trop tard' : '❄️ à congeler'}</span>` : ''}</td>`;
  };
  return `<table class="schedule">
    <thead><tr><th></th>${meals.map(m => `<th>${MEAL_LABELS[m]}</th>`).join('')}</tr></thead>
    <tbody>${days.map(d => `<tr><td>${esc(dayLabel(plan.settings.startDate, d))}</td>
      ${meals.map(m => cell(plan.schedule.find(s => s.day === d && s.meal === m))).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

// ---------------- Menu ----------------

function viewMenu() {
  const plan = currentPlan();
  if (!plan) return emptyState('🍱', 'Aucun menu pour l\'instant', 'Génère ton premier menu de la semaine.', 'plan', 'Planifier');
  const isCurrent = plan.id === state.household.currentPlanId;
  const sorted = [...plan.recipes].sort((a, b) => (b.time || 0) - (a.time || 0));
  return `
  ${viewPlanPicker(plan)}
  <section class="card">
    <div class="row"><h2 style="margin:0">${esc(plan.name)}</h2><span class="spacer"></span>
      ${isCurrent ? '<span class="pill">Menu actuel</span>' : `<button class="btn small" data-action="set-current" data-id="${plan.id}">Définir comme actuel</button>`}
    </div>
    <p class="muted" style="margin-top:4px">${plan.settings.people} pers. · ${plan.settings.days} jours · créé par ${esc(plan.createdByName || '—')}</p>
    ${viewSchedule(plan)}
  </section>
  <section class="card">
    <h2>👩‍🍳 Session batch cooking</h2>
    <p class="muted">Ordre conseillé : lance d'abord les cuissons longues (four, mijotés), prépare les plats rapides pendant ce temps.
      Les éléments marqués « au moment de servir » (œufs mollets, avocat, sauces) se font le jour J.</p>
    ${sorted.map((r, i) => viewBatchRecipe(r, i, plan)).join('')}
  </section>
  <div class="row end"><button class="btn small ghost" data-action="delete-plan" data-id="${plan.id}">🗑️ Supprimer ce menu</button></div>`;
}

function viewPlanPicker(plan) {
  if (state.plans.length < 2) return '';
  return `<label style="margin-bottom:12px">Historique
    <select data-change="pick-plan" id="plan-picker">
      ${state.plans.map(p => `<option value="${p.id}" ${p.id === plan.id ? 'selected' : ''}>${esc(p.name)}${p.id === state.household.currentPlanId ? ' (actuel)' : ''}</option>`).join('')}
    </select></label>`;
}

function viewBatchRecipe(r, i, plan) {
  const frozenDays = plan.schedule.filter(s => s.recipeId === r.id && s.freeze).map(s => dayLabel(plan.settings.startDate, s.day));
  return `<details class="recipe" ${i === 0 ? 'open' : ''}>
    <summary><span class="dot" style="background:${colorFor(r.id)}"></span><b>${i + 1}. ${esc(r.name)}</b><span class="pill">${r.portions} portions</span></summary>
    <div class="body">
      <div class="recipe-meta">${r.time || '?'} min · se garde ${r.keeps} jours au frigo${r.freezable ? ' · congelable' : ''}</div>
      ${frozenDays.length ? `<div class="notice info">❄️ Congèle les portions de : ${frozenDays.map(esc).join(', ')}. Sors-les du congélateur la veille.</div>` : ''}
      <b>Ingrédients pour ${r.portions} portions</b>
      <ul>${r.ingredients.map(ing => `<li>${esc(formatQty(Math.round(ing.qty * r.portions * 10) / 10, ing.unit))} ${esc(ing.name)}</li>`).join('')}</ul>
      ${r.steps?.length ? `<b>Étapes</b><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <p class="muted" style="font-size:.88rem">Répartis en ${r.portions} boîtes (${r.meals} repas × ${plan.settings.people} pers.).</p>
    </div>
  </details>`;
}

// ---------------- Courses ----------------

function viewCourses() {
  const plan = currentPlan();
  if (!plan) return emptyState('🛒', 'Pas encore de liste', 'La liste se crée automatiquement quand tu valides un menu.', 'plan', 'Planifier');
  const items = Object.values(plan.items || {});
  const done = items.filter(i => i.checked).length;
  const groups = groupItems(plan.items);
  return `
  ${viewPlanPicker(plan)}
  <section class="card">
    <div class="row"><h2 style="margin:0">Liste de courses</h2><span class="spacer"></span><span class="muted">${done}/${items.length}</span></div>
    <div class="progress"><div style="width:${items.length ? (done / items.length) * 100 : 0}%"></div></div>
    <div class="row">
      <button class="btn accent" data-action="bring">📲 Envoyer à Bring</button>
      <button class="btn" data-action="copy-list">📋 Copier</button>
      <span class="spacer"></span>
      ${done ? '<button class="btn small ghost" data-action="uncheck-all">Tout décocher</button>' : ''}
    </div>
    <label class="check-line">
      <input type="checkbox" data-change="pantry" ${state.includePantry ? 'checked' : ''}>
      <span>Inclure le placard (épices, huile…) dans l'envoi à Bring</span>
    </label>
    ${groups.map(g => `<div class="group"><h3>${esc(g.label)}</h3>
      ${g.items.map(it => `<label class="item ${it.checked ? 'done' : ''}">
        <input type="checkbox" data-change="toggle-item" data-id="${esc(it.id)}" ${it.checked ? 'checked' : ''}>
        <span class="name">${esc(it.name)}</span>
        <span class="qty">${esc(formatQty(it.qty, it.unit))}</span>
        ${it.manual ? `<button class="icon-btn" data-action="remove-item" data-id="${esc(it.id)}" aria-label="Supprimer">✕</button>` : ''}
      </label>`).join('')}
    </div>`).join('')}
    <form data-form="add-item" class="add-row">
      <input type="text" name="line" id="add-item" placeholder="Ajouter : 1 kg de pommes, lessive…" autocomplete="off" required>
      <button class="btn primary" aria-label="Ajouter">＋</button>
    </form>
  </section>`;
}

// ---------------- Recettes ----------------

function viewRecipes() {
  const q = state.recipeSearch.toLowerCase();
  const list = allRecipes().filter(r =>
    (state.recipeTag === 'tous' || (state.recipeTag === 'perso' ? r.custom : (r.tags || []).includes(state.recipeTag))) &&
    (!q || r.name.toLowerCase().includes(q) || r.ingredients.some(i => i.name.toLowerCase().includes(q))));
  const tags = ['tous', ...TAGS, 'perso'];
  const tagLabel = { tous: 'Toutes', vegetarien: 'Végé', vegan: 'Vegan', poisson: 'Poisson', viande: 'Viande', 'sans-gluten': 'Sans gluten', perso: 'Mes recettes' };
  return `
  <section class="card">
    <h2>Recettes <span class="muted" style="font-size:1rem">(${list.length})</span></h2>
    <input type="search" id="recipe-search" data-live="1" data-input="recipe-search" placeholder="Chercher une recette ou un ingrédient…" value="${esc(state.recipeSearch)}">
    <div class="chips" style="margin:10px 0 14px">
      ${tags.map(t => `<button class="chip toggle ${state.recipeTag === t ? 'on' : ''}" data-action="recipe-tag" data-tag="${t}">${tagLabel[t]}</button>`).join('')}
    </div>
    ${list.map(viewRecipeItem).join('') || '<p class="muted">Aucune recette.</p>'}
  </section>
  ${viewRecipeForm()}`;
}

function viewRecipeItem(r) {
  const forced = state.forced.has(r.id);
  return `<details class="recipe">
    <summary><b style="flex:1">${esc(r.name)}</b>${r.custom ? '<span class="pill">perso</span>' : ''}</summary>
    <div class="body">
      <div class="recipe-meta">${r.time || '?'} min · ${r.kcal ? r.kcal + ' kcal · ' : ''}se garde ${r.keeps} j${r.freezable ? ' · congelable' : ''} · ${(r.tags || []).join(', ')}</div>
      <b>Pour 1 portion</b>
      <ul>${r.ingredients.map(i => `<li>${esc(formatQty(i.qty, i.unit))} ${esc(i.name)}</li>`).join('')}</ul>
      ${r.steps?.length ? `<ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <div class="row">
        <button class="btn small ${forced ? 'primary' : ''}" data-action="force" data-id="${esc(r.id)}">${forced ? '⭐ Imposée' : '☆ Imposer dans le prochain menu'}</button>
        ${r.custom ? `<button class="btn small ghost" data-action="delete-recipe" data-id="${esc(r.id)}">🗑️ Supprimer</button>` : ''}
      </div>
    </div>
  </details>`;
}

function viewRecipeForm() {
  return `<details class="card recipe" style="padding:0">
    <summary style="padding:16px 18px"><b>➕ Ajouter ma recette</b></summary>
    <form data-form="recipe" class="grid-form" style="padding:0 18px 18px">
      <label class="full">Nom<input type="text" name="name" id="r-name" required></label>
      <label>Écrite pour (portions)<input type="number" name="servings" id="r-serv" min="1" value="4" required></label>
      <label>Temps (min)<input type="number" name="time" id="r-time" min="0" value="30"></label>
      <label>Se garde (jours)<input type="number" name="keeps" id="r-keeps" min="1" max="7" value="3"></label>
      <label>kcal/portion<input type="number" name="kcal" id="r-kcal" min="0" placeholder="facultatif"></label>
      <div class="full chips">
        ${TAGS.map(t => `<label class="chip toggle"><input type="checkbox" name="tags" value="${t}" data-change="chip">${t}</label>`).join('')}
        <label class="chip toggle"><input type="checkbox" name="freezable" value="1" data-change="chip">❄️ congelable</label>
      </div>
      <label class="full">Ingrédients (un par ligne)
        <textarea name="ingredients" id="r-ing" placeholder="500 g blanc de poulet&#10;2 oignons&#10;1 c.à.s huile d'olive&#10;25 cl lait de coco" required></textarea>
      </label>
      <label class="full">Étapes (une par ligne)<textarea name="steps" id="r-steps"></textarea></label>
      <button class="btn primary full">Enregistrer la recette</button>
    </form>
  </details>`;
}

// ---------------- Foyer ----------------

function viewFoyer() {
  const h = state.household;
  const names = h.memberNames || {};
  return `
  <section class="card">
    <h2>🏠 Mon foyer</h2>
    <form data-form="rename" class="add-row">
      <input type="text" name="name" id="h-name" value="${esc(h.name)}" required>
      <button class="btn">Renommer</button>
    </form>
    <h3 style="margin-top:18px">Membres</h3>
    <div class="chips">${(h.members || []).map(m => `<span class="chip ${m === uid() ? 'on' : ''}">👤 ${esc(names[m] || 'Membre')}${m === uid() ? ' (moi)' : ''}</span>`).join('')}</div>
  </section>
  <section class="card">
    <h2>Inviter quelqu'un</h2>
    <p>Envoie ce code à ton/ta partenaire. Une fois saisi dans son onglet Foyer, vous partagez les menus, les recettes perso et la liste de courses en temps réel.</p>
    <div class="row"><div class="code-box">${esc(h.id)}</div><button class="btn" data-action="copy-code">Copier</button></div>
    <p class="muted" style="font-size:.85rem;margin-top:8px">Garde ce code privé : il donne accès à ton foyer.</p>
  </section>
  <section class="card">
    <h2>Rejoindre un foyer</h2>
    <p class="muted">Tu quittes ton foyer actuel pour rejoindre celui de ton/ta partenaire.</p>
    <form data-form="join" class="add-row">
      <input type="text" name="code" id="join-code" placeholder="Code d'invitation" autocomplete="off" required>
      <button class="btn primary">Rejoindre</button>
    </form>
  </section>
  <section class="card">
    <p class="muted" style="margin:0">Connecté·e en tant que ${esc(state.user.email || myName())}</p>
  </section>`;
}

function emptyState(icon, title, text, tab, cta) {
  return `<section class="card empty"><div class="big">${icon}</div><h2>${title}</h2><p class="muted">${text}</p>
    <button class="btn primary" data-action="tab" data-tab="${tab}">${cta}</button></section>`;
}

// ====================================================================
// Actions
// ====================================================================

const planRef = id => doc(db, 'households', hid(), 'plans', id);

const actions = {
  tab(el) { state.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },

  'auth-toggle'() { state.authMode = state.authMode === 'login' ? 'signup' : 'login'; render(); },
  async google() { try { await signInWithPopup(auth, googleProvider); } catch (e) { fail(e); } },
  async 'reset-password'() {
    const email = $('#f-email')?.value.trim();
    if (!email) return toast('Saisis ton e-mail d\'abord.');
    try { await sendPasswordResetEmail(auth, email); toast('E-mail de réinitialisation envoyé.'); } catch (e) { fail(e); }
  },
  async logout() { if (confirm('Se déconnecter ?')) await signOut(auth); },

  regenerate() { doGenerate(); },
  reroll(el) {
    try { state.draft = rerollRecipe(state.draft, el.dataset.id, allRecipes()); render(); } catch (e) { fail(e); }
  },
  lock(el) {
    const id = el.dataset.id;
    state.forced.has(id) ? state.forced.delete(id) : state.forced.add(id);
    render();
  },
  unforce(el) { state.forced.delete(el.dataset.id); render(); },
  force(el) {
    const id = el.dataset.id;
    if (state.forced.has(id)) { state.forced.delete(id); }
    else { state.forced.add(id); toast('Ajoutée au prochain menu ⭐'); }
    render();
  },

  async validate() {
    const d = state.draft;
    if (!d || state.busy) return;
    state.busy = true; render();
    try {
      const ref = await addDoc(collection(db, 'households', hid(), 'plans'), clean({
        name: `Semaine du ${dayLabel(d.settings.startDate, 0)}`,
        createdAtMs: Date.now(),
        createdBy: uid(),
        createdByName: myName(),
        settings: d.settings,
        recipes: d.recipes,
        schedule: d.schedule,
        items: buildShoppingList(d),
      }));
      await updateDoc(doc(db, 'households', hid()), { currentPlanId: ref.id });
      state.draft = null; state.forced.clear(); state.selectedPlanId = null; state.tab = 'menu';
      toast('Menu enregistré et partagé avec ton foyer ✅');
    } catch (e) { fail(e); }
    state.busy = false; render(); window.scrollTo(0, 0);
  },

  async 'set-current'(el) {
    try { await updateDoc(doc(db, 'households', hid()), { currentPlanId: el.dataset.id }); state.selectedPlanId = null; }
    catch (e) { fail(e); }
  },
  async 'delete-plan'(el) {
    if (!confirm('Supprimer ce menu et sa liste de courses ?')) return;
    const id = el.dataset.id;
    try {
      await deleteDoc(planRef(id));
      if (state.household.currentPlanId === id) {
        const next = state.plans.find(p => p.id !== id);
        await updateDoc(doc(db, 'households', hid()), { currentPlanId: next?.id || null });
      }
      state.selectedPlanId = null;
      toast('Menu supprimé.');
    } catch (e) { fail(e); }
  },

  async 'remove-item'(el, e) {
    e.preventDefault();
    try { await updateDoc(planRef(currentPlan().id), { [`items.${el.dataset.id}`]: deleteField() }); } catch (err) { fail(err); }
  },
  async 'uncheck-all'() {
    const plan = currentPlan();
    const upd = {};
    for (const it of Object.values(plan.items || {})) if (it.checked) upd[`items.${it.id}.checked`] = false;
    try { await updateDoc(planRef(plan.id), upd); } catch (e) { fail(e); }
  },
  'copy-list'() {
    const plan = currentPlan();
    const text = groupItems(plan.items)
      .map(g => `${g.label}\n${g.items.filter(i => !i.checked).map(i => '• ' + itemLine(i)).join('\n')}`)
      .filter(block => block.includes('•'))
      .join('\n\n');
    copy(text, 'Liste copiée 📋');
  },
  bring() { sendToBring(); },

  'recipe-tag'(el) { state.recipeTag = el.dataset.tag; render(); },
  async 'delete-recipe'(el) {
    if (!confirm('Supprimer cette recette ?')) return;
    try { await deleteDoc(doc(db, 'households', hid(), 'recipes', el.dataset.id)); state.forced.delete(el.dataset.id); }
    catch (e) { fail(e); }
  },

  'copy-code'() { copy(hid(), 'Code copié — envoie-le à ton/ta partenaire.'); },
};

const changes = {
  'meal-chip'(el) { el.closest('.chip').classList.toggle('on', el.checked); },
  chip(el) { el.closest('.chip').classList.toggle('on', el.checked); },
  'pick-plan'(el) { state.selectedPlanId = el.value; render(); },
  pantry(el) { state.includePantry = el.checked; },
  async 'toggle-item'(el) {
    el.closest('.item').classList.toggle('done', el.checked);
    try { await updateDoc(planRef(currentPlan().id), { [`items.${el.dataset.id}.checked`]: el.checked }); }
    catch (e) { fail(e); }
  },
};

const forms = {
  async auth(f) {
    const fd = new FormData(f);
    state.busy = true; render();
    try {
      if (state.authMode === 'signup') {
        pendingName = String(fd.get('name') || '').trim();
        const cred = await createUserWithEmailAndPassword(auth, fd.get('email'), fd.get('password'));
        await updateProfile(cred.user, { displayName: String(fd.get('name') || '').trim() });
      } else {
        await signInWithEmailAndPassword(auth, fd.get('email'), fd.get('password'));
      }
    } catch (e) { fail(e); }
    state.busy = false; render();
  },

  plan(f) {
    const fd = new FormData(f);
    const meals = fd.getAll('meals');
    if (!meals.length) return toast('Choisis au moins un repas (midi ou soir).');
    state.settings = {
      people: clamp(fd.get('people'), 1, 12),
      days: clamp(fd.get('days'), 1, 14),
      recipeCount: clamp(fd.get('recipeCount'), 1, 10),
      meals,
      diet: fd.get('diet'),
      startDate: fd.get('startDate') || todayISO(),
    };
    saveSettings();
    doGenerate();
  },

  async 'add-item'(f) {
    const parsed = parseIngredientLine(new FormData(f).get('line'));
    if (!parsed) return;
    const plan = currentPlan();
    const hasQty = /^\s*\d/.test(f.line.value);
    const id = `m_${slug(parsed.name)}_${Date.now().toString(36)}`;
    try {
      await updateDoc(planRef(plan.id), {
        [`items.${id}`]: { id, name: parsed.name, qty: hasQty ? parsed.qty : 0, unit: hasQty ? parsed.unit : '', cat: parsed.cat, checked: false, manual: true },
      });
      f.reset(); $('#add-item')?.focus();
    } catch (e) { fail(e); }
  },

  async recipe(f) {
    const fd = new FormData(f);
    const servings = Math.max(1, Number(fd.get('servings')) || 1);
    const ingredients = String(fd.get('ingredients')).split('\n').map(parseIngredientLine).filter(Boolean)
      .map(i => ({ ...i, qty: Math.round((i.qty / servings) * 1000) / 1000 }));
    if (!ingredients.length) return toast('Ajoute au moins un ingrédient.');
    const tags = fd.getAll('tags');
    const recipe = {
      name: String(fd.get('name')).trim(),
      tags,
      main: tags.includes('viande') ? 'viande-perso' : tags.includes('poisson') ? 'poisson-perso' : 'vege-perso',
      time: Number(fd.get('time')) || 0,
      kcal: Number(fd.get('kcal')) || 0,
      keeps: clamp(fd.get('keeps'), 1, 7),
      freezable: fd.get('freezable') === '1',
      ingredients,
      steps: String(fd.get('steps') || '').split('\n').map(s => s.trim()).filter(Boolean),
      createdBy: uid(),
      createdAtMs: Date.now(),
    };
    try {
      await addDoc(collection(db, 'households', hid(), 'recipes'), clean(recipe));
      f.reset();
      f.closest('details').open = false;
      toast('Recette ajoutée 📖 — elle pourra sortir dans tes prochains menus.');
    } catch (e) { fail(e); }
  },

  async rename(f) {
    const name = String(new FormData(f).get('name')).trim();
    if (!name) return;
    try { await updateDoc(doc(db, 'households', hid()), { name }); toast('Foyer renommé.'); f.querySelector('input').blur(); }
    catch (e) { fail(e); }
  },

  async join(f) {
    const code = String(new FormData(f).get('code')).trim();
    if (!code || code === hid()) return toast('Ce code est celui de ton propre foyer.');
    if (!confirm('Rejoindre ce foyer ? Tes menus actuels resteront dans ton ancien foyer.')) return;
    const oldId = hid();
    try {
      const snap = await getDoc(doc(db, 'households', code));
      if (!snap.exists()) return toast('Code introuvable.');
      await updateDoc(doc(db, 'households', code), {
        members: arrayUnion(uid()),
        [`memberNames.${uid()}`]: myName(),
      });
      await setDoc(doc(db, 'users', uid()), { householdId: code }, { merge: true });
      try { await updateDoc(doc(db, 'households', oldId), { members: arrayRemove(uid()) }); } catch { /* best effort */ }
      state.plans = []; state.customRecipes = []; state.selectedPlanId = null;
      subscribe(code);
      state.tab = 'menu';
      toast('Bienvenue dans le foyer 🎉');
    } catch (e) { fail(e); }
  },
};

function doGenerate() {
  try {
    state.draft = generatePlan(state.settings, allRecipes(), [...state.forced]);
    render();
    setTimeout(() => document.querySelectorAll('.card')[1]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  } catch (e) { fail(e); }
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, Math.round(Number(v) || min))); }

async function copy(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { prompt('Copie ce texte :', text); }
}

// ---------------- Bring ----------------

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sendToBring() {
  const plan = currentPlan();
  if (!WORKER_URL) return toast('Configure WORKER_URL dans js/firebase-config.js (voir README).', 5000);
  const lines = Object.values(plan.items || {})
    .filter(i => !i.checked && (state.includePantry || i.cat !== 'placard'))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, 'fr'))
    .map(itemLine);
  if (!lines.length) return toast('Rien à envoyer : tout est coché.');
  const payload = toBase64Url(JSON.stringify({ t: plan.name, i: lines }));
  const pageUrl = `${WORKER_URL.replace(/\/$/, '')}/?d=${payload}`;
  const deeplink = `https://api.getbring.com/rest/bringrecipes/deeplink?url=${encodeURIComponent(pageUrl)}&source=web&baseQuantity=1&requestedQuantity=1`;
  window.open(deeplink, '_blank', 'noopener');
}

// ====================================================================
// Délégation d'événements
// ====================================================================

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { if (el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && changes[el.dataset.change]) changes[el.dataset.change](el, e);
});
document.addEventListener('input', e => {
  if (e.target.dataset.input === 'recipe-search') { state.recipeSearch = e.target.value; render(); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f || !forms[f.dataset.form]) return;
  e.preventDefault();
  forms[f.dataset.form](f);
});

// exposés pour le débogage dans la console
window.__menuBatch = { state, CATEGORIES, CAT_LABEL, guessCategory };
