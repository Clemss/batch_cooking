// Cloudflare Worker : transforme une liste de courses en « recette » lisible par Bring!.
//
// Fonctionnement : l'appli ouvre
//   https://api.getbring.com/rest/bringrecipes/deeplink?url=<ce worker>?d=<liste encodée>&source=web
// Les serveurs de Bring! téléchargent cette page, lisent les ingrédients au format
// schema.org/Recipe, puis l'app Bring! propose de les ajouter à ta liste.
//
// Le worker ne stocke rien : la liste est entièrement contenue dans l'URL.

const MAX_ITEMS = 250;
const MAX_LEN = 140;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/health') return new Response('ok');

    const d = url.searchParams.get('d');
    if (!d) return page('Menu Batch → Bring!', [], 'Aucune liste reçue.', 400);

    let data;
    try {
      data = JSON.parse(fromBase64Url(d));
    } catch {
      return page('Menu Batch → Bring!', [], 'Liste illisible.', 400);
    }

    const title = clip(data.t || 'Liste de courses', 120);
    const items = (Array.isArray(data.i) ? data.i : [])
      .slice(0, MAX_ITEMS)
      .map(x => clip(x, MAX_LEN))
      .filter(Boolean);

    return page(title, items);
  },
};

function clip(v, n) {
  return String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
}

function fromBase64Url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function page(title, items, error = '', status = 200) {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: title,
    description: 'Liste de courses générée par Menu Batch',
    recipeYield: '1',
    image: 'https://em-content.zobj.net/source/apple/391/green-salad_1f957.png',
    recipeIngredient: items,
  }).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<script type="application/ld+json">${jsonLd}</script>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;background:#f6f1e7;color:#1f2a26}
  h1{font-size:1.4rem} li{padding:4px 0} .err{color:#b3261e}
</style>
</head>
<body>
<article itemscope itemtype="https://schema.org/Recipe">
  <h1 itemprop="name">${esc(title)}</h1>
  <meta itemprop="recipeYield" content="1">
  ${error ? `<p class="err">${esc(error)}</p>` : ''}
  <ul>
    ${items.map(i => `<li itemprop="recipeIngredient">${esc(i)}</li>`).join('\n    ')}
  </ul>
</article>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
