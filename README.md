# 🥗 Menu Batch

Appli web pour planifier les menus healthy de la semaine en **batch cooking** :
tu choisis le nombre de personnes, de jours, de repas et de recettes, l'appli génère
le menu avec les bonnes portions, la session de cuisine et la liste de courses.
Le tout est partagé en temps réel avec ton foyer et peut être envoyé dans **Bring!**.

- Front : HTML/CSS/JS sans build, hébergé sur **GitHub Pages**
- Données & comptes : **Firebase** (Authentication + Firestore)
- Envoi vers Bring! : un petit **Cloudflare Worker** gratuit

```
index.html
css/style.css
js/
  app.js              ← interface
  planner.js          ← génération des menus, liste de courses (logique pure)
  recipes.js          ← 32 recettes healthy (quantités pour 1 portion)
  firebase.js         ← initialisation Firebase
  firebase-config.js  ← ⚠️ à remplir
firestore.rules       ← règles de sécurité à coller dans Firebase
worker/               ← Worker Cloudflare pour Bring!
```

---

## 1. Firebase

1. **Config web** : Console Firebase → ⚙️ *Paramètres du projet* → *Tes applications* → app Web
   (crée-la si besoin) → copie l'objet `firebaseConfig` dans `js/firebase-config.js`.
2. **Authentication** → *Sign-in method* → active **E-mail/Mot de passe** et **Google**.
3. **Authentication** → *Paramètres* → *Domaines autorisés* → ajoute `TON-PSEUDO.github.io`.
   (Sans ça, la connexion Google affiche « domaine non autorisé ».)
4. **Firestore Database** → crée la base (mode production, région `eur3` ou `europe-west`).
5. **Firestore** → onglet *Règles* → colle le contenu de `firestore.rules` → *Publier*.

Pas besoin d'index composite : les requêtes sont simples.

## 2. Bring! (Cloudflare Worker)

Bring! n'a pas d'API publique officielle. L'appli utilise leur **import de recettes** :
le bouton « Envoyer à Bring » ouvre un lien Bring! qui va lire une page contenant la liste
au format schema.org/Recipe. Le Worker génère cette page à la volée (rien n'est stocké).

**Option simple (sans terminal)**
1. Crée un compte gratuit sur [dash.cloudflare.com](https://dash.cloudflare.com).
2. *Workers & Pages* → *Create* → *Create Worker* → nomme-le `menu-batch-bring` → *Deploy*.
3. *Edit code* → remplace tout par le contenu de `worker/bring-worker.js` → *Deploy*.
4. Copie l'URL (`https://menu-batch-bring.xxx.workers.dev`) dans `WORKER_URL` de `js/firebase-config.js`.

**Option terminal** : `cd worker && npx wrangler deploy`.

Test : ouvre `https://<ton-worker>/?d=eyJ0IjoiVGVzdCIsImkiOlsiMiBjYXJvdHRlcyJdfQ`
→ tu dois voir une page « Test » avec « 2 carottes ».

Sur téléphone, le bouton ouvre l'app Bring! sur l'écran d'import : choisis ta liste et valide.
Les articles déjà cochés dans Menu Batch ne sont pas envoyés ; le placard (huile, épices)
est exclu sauf si tu coches l'option.

## 3. GitHub Pages

1. Pousse ce dossier à la racine de ton dépôt (branche `main`).
2. Dépôt → *Settings* → *Pages* → *Source : Deploy from a branch* → `main` / `/ (root)` → *Save*.
3. L'appli est en ligne sur `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/` après 1–2 minutes.

Pour tester en local : `python3 -m http.server 8000` puis http://localhost:8000
(ouvrir `index.html` directement ne marche pas à cause des modules JS).
`localhost` est autorisé par défaut dans Firebase Auth.

## 4. Partager avec ton/ta partenaire

1. Chacun crée son compte.
2. Toi : onglet **Foyer** → *Copier* le code d'invitation → envoie-le.
3. Lui/elle : onglet **Foyer** → *Rejoindre un foyer* → colle le code.

Vous voyez alors les mêmes menus, recettes perso et liste de courses ; cocher un article
est visible instantanément sur l'autre téléphone.

---

## Comment marche la génération

- Les recettes sont choisies au hasard selon le régime, en variant la protéine principale.
- Les repas sont répartis **par urgence de conservation** : ce qui se garde 2 jours
  (poisson…) est mangé en premier, les plats mijotés (5 jours) en fin de semaine.
- Si un repas tombe après la durée de conservation, il est marqué ❄️ *à congeler*
  (ou ⚠️ si le plat ne se congèle pas — l'appli essaie 40 tirages pour l'éviter).
- La liste de courses additionne les ingrédients × portions, regroupe par rayon et
  arrondit à des quantités achetables.

## Aliments exclus

Onglet **Foyer** → *Aliments qu'on n'aime pas* : ajoute un ou plusieurs aliments
(séparés par des virgules). Les recettes qui en contiennent ne sortent plus dans les menus
générés (elles restent visibles dans l'onglet Recettes avec un badge 🚫).
Mots-familles acceptés : « poisson », « viande », « fromage », « laitages », « fruits de mer », « porc », « bœuf ».

## Ajouter des recettes

- Dans l'appli : onglet **Recettes** → *Ajouter ma recette* (partagée avec le foyer).
  Écris les ingrédients comme sur papier (`500 g poulet`, `2 oignons`, `25 cl lait de coco`) :
  l'appli les convertit et devine le rayon.
- Dans le code : ajoute une entrée dans `js/recipes.js` (quantités pour **1 portion**).
