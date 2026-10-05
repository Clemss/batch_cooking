// Logique pure (aucune dépendance Firebase) : génération du menu batch,
// répartition des repas, liste de courses, parsing des ingrédients.

export const CATEGORIES = [
  ['legumes', '🥦 Fruits & légumes'],
  ['proteines', '🍗 Viandes, poissons & tofu'],
  ['cremerie', '🧀 Crèmerie & œufs'],
  ['feculents', '🍚 Féculents & pain'],
  ['epicerie', '🥫 Épicerie'],
  ['surgeles', '🧊 Surgelés'],
  ['placard', '🧂 Placard (à vérifier)'],
  ['autre', '🛒 Autre'],
];
export const CAT_LABEL = Object.fromEntries(CATEGORIES);

export const MEAL_LABELS = { midi: 'Midi', soir: 'Soir' };

export const DIETS = [
  ['tous', 'Tout'],
  ['vegetarien', 'Végétarien'],
  ['vegan', 'Vegan'],
  ['pescetarien', 'Pescétarien'],
  ['sans-gluten', 'Sans gluten'],
];

export const TAGS = ['vegetarien', 'vegan', 'poisson', 'viande', 'sans-gluten'];

// ---------- utilitaires ----------

export function slug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'x';
}

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function matchesDiet(recipe, diet) {
  const t = recipe.tags || [];
  switch (diet) {
    case 'vegetarien': return t.includes('vegetarien') || t.includes('vegan');
    case 'vegan': return t.includes('vegan');
    case 'pescetarien': return !t.includes('viande');
    case 'sans-gluten': return t.includes('sans-gluten');
    default: return true;
  }
}

// ---------- aliments non aimés ----------

function norm(s) {
  return String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').trim();
}

// Mots qui désignent une famille plutôt qu'un ingrédient précis.
const DISLIKE_TAGS = { poisson: 'poisson', poissons: 'poisson', viande: 'viande', viandes: 'viande' };
const DISLIKE_ALIASES = {
  'fruits de mer': ['crevette'],
  'fruit de mer': ['crevette'],
  porc: ['porc', 'filet mignon', 'jambon', 'lardon'],
  boeuf: ['boeuf', 'rumsteck', 'steak'],
  laitage: ['lait', 'yaourt', 'feta', 'parmesan', 'gruyere', 'emmental', 'creme'],
  laitages: ['lait', 'yaourt', 'feta', 'parmesan', 'gruyere', 'emmental', 'creme'],
  fromage: ['feta', 'parmesan', 'gruyere', 'emmental', 'mozzarella', 'fromage', 'chevre', 'ricotta'],
};

/** Renvoie la liste des aliments non aimés présents dans la recette. */
export function dislikeMatches(recipe, dislikes = []) {
  const found = [];
  const names = (recipe.ingredients || []).map(i => norm(i.name));
  for (const raw of dislikes) {
    const d = norm(raw);
    if (!d) continue;
    if (DISLIKE_TAGS[d] && (recipe.tags || []).includes(DISLIKE_TAGS[d])) { found.push(raw); continue; }
    const words = DISLIKE_ALIASES[d] || [d.replace(/(s|x)$/, '')];
    const hit = words.some(w => {
      const re = new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|x)?(\\s|$)`);
      return names.some(n => re.test(n) && !(w === 'lait' && n.startsWith('lait de coco')));
    });
    if (hit) found.push(raw);
  }
  return found;
}

function mainOf(r) { return r.main || (r.tags || [])[0] || 'autre'; }

// ---------- génération ----------

/**
 * Génère un menu batch.
 * settings = { people, days, meals:['midi','soir'], recipeCount, diet, startDate }
 * forced = ids de recettes imposées
 */
export function generatePlan(settings, recipes, forced = [], rng = Math.random) {
  const slots = buildSlots(settings);
  if (!slots.length) throw new Error('Choisis au moins un repas par jour.');

  const pool = recipes.filter(r => matchesDiet(r, settings.diet) && !dislikeMatches(r, settings.dislikes).length);
  if (!pool.length && !forced.length) throw new Error('Aucune recette ne correspond à ce régime et à vos aliments exclus.');
  const n = Math.max(1, Math.min(Number(settings.recipeCount) || 1, slots.length));
  const forcedR = forced.map(id => recipes.find(r => r.id === id)).filter(Boolean).slice(0, n);

  // Plusieurs tirages : on garde celui qui pose le moins de problèmes de conservation.
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const chosen = [...forcedR];
    const rest = shuffle(pool.filter(r => !chosen.some(c => c.id === r.id)), rng);
    while (chosen.length < n && rest.length) {
      const used = new Set(chosen.map(mainOf));
      let idx = rest.findIndex(r => !used.has(mainOf(r)));
      if (idx < 0) idx = 0;
      chosen.push(rest.splice(idx, 1)[0]);
    }
    if (!chosen.length) throw new Error('Aucune recette ne correspond à ce régime.');
    const plan = assemble(settings, chosen);
    const score = plan.schedule.filter(s => s.warn).length * 10 + plan.schedule.filter(s => s.freeze).length;
    if (!best || score < best.score) best = { plan, score };
    if (score === 0) break;
  }
  return best.plan;
}

/** Remplace une recette du brouillon par une autre compatible. */
export function rerollRecipe(draft, recipeId, recipes, rng = Math.random) {
  const current = draft.recipes;
  const inPlan = new Set(current.map(r => r.id));
  const old = current.find(r => r.id === recipeId);
  const candidates = shuffle(
    recipes.filter(r => !inPlan.has(r.id) && matchesDiet(r, draft.settings.diet)
      && !dislikeMatches(r, draft.settings.dislikes).length),
    rng,
  );
  if (!candidates.length) throw new Error('Plus aucune autre recette disponible pour ce régime.');
  const used = new Set(current.filter(r => r.id !== recipeId).map(mainOf));
  const pick = candidates.find(r => !used.has(mainOf(r)) && mainOf(r) !== mainOf(old)) || candidates[0];
  const chosen = current.map(r => (r.id === recipeId ? pick : stripPlanFields(r)));
  return assemble(draft.settings, chosen);
}

function stripPlanFields(r) {
  const { meals, portions, ...rest } = r;
  return rest;
}

function buildSlots(settings) {
  const slots = [];
  const meals = ['midi', 'soir'].filter(m => (settings.meals || []).includes(m));
  for (let d = 0; d < Number(settings.days); d++) {
    for (const m of meals) slots.push({ day: d, meal: m });
  }
  return slots;
}

function assemble(settings, chosen) {
  const slots = buildSlots(settings);
  const people = Number(settings.people) || 1;
  const k = chosen.length;
  const base = Math.floor(slots.length / k);
  const extra = slots.length % k;

  // Les repas « en plus » vont aux recettes qui se conservent le mieux.
  const byKeepDesc = [...chosen].sort((a, b) => (b.keeps || 3) - (a.keeps || 3));
  const remaining = new Map(byKeepDesc.map((r, i) => [r.id, base + (i < extra ? 1 : 0)]));

  // Ordonnancement « au plus urgent » : à chaque repas on prend la recette
  // qui a le moins de marge avant sa date limite de conservation,
  // en évitant deux fois la même recette d'affilée.
  const mealsPerDay = Math.max(1, slots.length / Math.max(1, Number(settings.days)));
  const schedule = [];
  let prev = null;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const slack = r => ((r.keeps || 3) * mealsPerDay - i) - remaining.get(r.id);
    const cands = chosen
      .filter(r => remaining.get(r.id) > 0)
      .sort((a, b) => slack(a) - slack(b) || (a.keeps || 3) - (b.keeps || 3));
    let pick = cands[0];
    if (pick.id === prev && cands.length > 1 && slack(cands[1]) <= slack(pick) + mealsPerDay) pick = cands[1];
    remaining.set(pick.id, remaining.get(pick.id) - 1);
    const keeps = pick.keeps || 3;
    const freeze = s.day >= keeps; // cuisiné juste avant le jour 1
    schedule.push({
      day: s.day,
      meal: s.meal,
      recipeId: pick.id,
      freeze,
      warn: freeze && !pick.freezable,
    });
    prev = pick.id;
  }

  const recipes = chosen.map(r => {
    const meals = schedule.filter(s => s.recipeId === r.id).length;
    return { ...stripPlanFields(r), meals, portions: meals * people };
  }).filter(r => r.meals > 0);

  const warnings = [];
  for (const r of recipes) {
    const late = schedule.filter(s => s.recipeId === r.id && s.warn);
    if (late.length) {
      warnings.push(`« ${r.name} » se conserve ${r.keeps} jours et ne se congèle pas bien : ` +
        `${late.length} repas ${late.length > 1 ? 'tombent' : 'tombe'} après. Change-la ou réduis le nombre de jours.`);
    }
  }

  return { settings: { ...settings, people }, recipes, schedule, warnings };
}

// ---------- liste de courses ----------

function roundQty(q, unit) {
  if (unit === 'g' || unit === 'ml') {
    if (q < 20) return Math.ceil(q / 5) * 5;
    if (q < 500) return Math.ceil(q / 10) * 10;
    return Math.ceil(q / 50) * 50;
  }
  if (unit === 'c.à.s' || unit === 'c.à.c') return Math.ceil(q * 2) / 2;
  return Math.ceil(q - 1e-9);
}

/** Agrège les ingrédients de toutes les recettes, à l'échelle des portions. */
export function buildShoppingList(plan) {
  const map = new Map();
  for (const r of plan.recipes) {
    for (const ing of r.ingredients || []) {
      const unit = ing.unit || '';
      const id = `${slug(ing.name)}__${slug(unit || 'u')}`;
      const e = map.get(id) || { id, name: ing.name, unit, cat: ing.cat || 'autre', qty: 0, checked: false };
      e.qty += Number(ing.qty || 0) * r.portions;
      map.set(id, e);
    }
  }
  const items = {};
  for (const e of map.values()) items[e.id] = { ...e, qty: roundQty(e.qty, e.unit) };
  return items;
}

/** Trie les items par rayon puis par nom. */
export function groupItems(items) {
  const groups = CATEGORIES.map(([cat, label]) => ({ cat, label, items: [] }));
  const idx = Object.fromEntries(groups.map((g, i) => [g.cat, i]));
  for (const it of Object.values(items || {})) {
    groups[idx[it.cat] ?? idx.autre].items.push(it);
  }
  for (const g of groups) g.items.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return groups.filter(g => g.items.length);
}

// ---------- affichage des quantités ----------

const PLURAL_UNITS = ['gousse', 'tranche', 'boîte', 'botte', 'sachet', 'pincée'];

function num(x) {
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

export function formatQty(q, unit) {
  if (!q) return '';
  if (unit === 'g' && q >= 1000) return `${num(q / 1000)} kg`;
  if (unit === 'ml' && q >= 1000) return `${num(q / 1000)} L`;
  if (!unit) return num(q);
  if (PLURAL_UNITS.includes(unit) && q > 1) return `${num(q)} ${unit}s`;
  return `${num(q)} ${unit}`;
}

/** Ligne texte pour Bring / copier-coller, ex. « 400 g blanc de poulet ». */
export function itemLine(it) {
  const q = formatQty(it.qty, it.unit);
  return q ? `${q} ${it.name}` : it.name;
}

// ---------- parsing des ingrédients saisis à la main ----------

const UNIT_MAP = {
  g: ['g', 1], gr: ['g', 1], gramme: ['g', 1], grammes: ['g', 1],
  kg: ['g', 1000],
  ml: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['ml', 1000], litre: ['ml', 1000], litres: ['ml', 1000],
  'c.à.s': ['c.à.s', 1], 'càs': ['c.à.s', 1], cas: ['c.à.s', 1], cs: ['c.à.s', 1], 'c.a.s': ['c.à.s', 1], cuillere: ['c.à.s', 1],
  'c.à.c': ['c.à.c', 1], 'càc': ['c.à.c', 1], cac: ['c.à.c', 1], cc: ['c.à.c', 1], 'c.a.c': ['c.à.c', 1],
  gousse: ['gousse', 1], gousses: ['gousse', 1],
  tranche: ['tranche', 1], tranches: ['tranche', 1],
  boite: ['boîte', 1], boites: ['boîte', 1], 'boîte': ['boîte', 1], 'boîtes': ['boîte', 1],
  botte: ['botte', 1], bottes: ['botte', 1],
  sachet: ['sachet', 1], sachets: ['sachet', 1],
  pincee: ['pincée', 1], 'pincée': ['pincée', 1], pincees: ['pincée', 1], 'pincées': ['pincée', 1],
};

function parseNum(s) {
  s = s.replace(',', '.').replace(/\s/g, '');
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : a;
  }
  return Number(s);
}

export function parseIngredientLine(line) {
  const s = String(line || '').trim();
  if (!s) return null;
  let qty = 1, unit = '', rest = s;
  const m = s.match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(.*)$/);
  if (m) {
    qty = parseNum(m[1]);
    rest = m[2];
    const um = rest.match(/^(\S+)\s+(.+)$/);
    if (um) {
      const key = um[1].toLowerCase().replace(/\.$/, '');
      const u = UNIT_MAP[key];
      if (u) { unit = u[0]; qty *= u[1]; rest = um[2]; }
    }
  }
  rest = rest.replace(/^(de |d'|d’|des )/i, '').trim();
  const name = rest || s;
  return { name, qty: Math.round(qty * 1000) / 1000, unit, cat: guessCategory(name) };
}

const CAT_KEYWORDS = [
  ['surgeles', ['surgel', 'edamame']],
  ['placard', ['huile', 'sel', 'poivre', 'épice', 'epice', 'curry', 'cumin', 'paprika', 'curcuma', 'ras el hanout',
    'herbes de provence', 'thym', 'origan', 'cannelle', 'vinaigre', 'sauce soja', 'tamari', 'moutarde', 'bouillon', 'miel', 'sirop']],
  ['cremerie', ['lait', 'yaourt', 'fromage', 'feta', 'parmesan', 'gruyère', 'gruyere', 'emmental', 'mozzarella', 'beurre', 'crème', 'creme', 'œuf', 'oeuf', 'skyr', 'ricotta', 'chèvre', 'chevre']],
  ['proteines', ['poulet', 'dinde', 'boeuf', 'bœuf', 'porc', 'veau', 'agneau', 'saumon', 'cabillaud', 'colin', 'thon', 'crevette', 'poisson', 'jambon', 'tofu', 'tempeh', 'steak', 'filet', 'merlu', 'truite', 'maquereau', 'sardine']],
  ['feculents', ['riz', 'pâtes', 'pates', 'spaghetti', 'quinoa', 'boulgour', 'semoule', 'pain', 'tortilla', 'nouilles', 'orge', 'pomme de terre', 'pommes de terre', 'patate', 'flocons', 'farine', 'lentilles', 'pois chiches', 'haricots rouges', 'haricots blancs']],
  ['epicerie', ['conserve', 'coulis', 'concassées', 'concassees', 'lait de coco', 'olive', 'raisins secs', 'graines', 'noix', 'amande', 'sésame', 'sesame', 'pâte de curry', 'maïs', 'mais']],
  ['legumes', ['tomate', 'courgette', 'carotte', 'oignon', 'ail', 'poivron', 'brocoli', 'épinard', 'epinard', 'salade', 'concombre', 'citron', 'pomme', 'banane', 'champignon', 'poireau', 'chou', 'aubergine', 'avocat', 'haricots verts', 'butternut', 'courge', 'navet', 'panais', 'céleri', 'celeri', 'gingembre', 'herbe', 'persil', 'coriandre', 'basilic', 'menthe', 'roquette', 'fruit', 'légume', 'legume', 'échalote', 'echalote', 'pois gourmands', 'bok choy', 'radis', 'betterave', 'fenouil', 'asperge']],
];

export function guessCategory(name) {
  const n = String(name || '').toLowerCase();
  // « lait de coco » doit passer avant « lait »
  if (n.includes('lait de coco')) return 'epicerie';
  for (const [cat, words] of CAT_KEYWORDS) {
    if (words.some(w => n.includes(w))) return cat;
  }
  return 'autre';
}

// ---------- dates ----------

export function dayLabel(startDate, d) {
  const base = startDate ? new Date(startDate + 'T12:00:00') : new Date();
  const dt = new Date(base.getTime() + d * 86400000);
  const s = dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayISO() {
  const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
