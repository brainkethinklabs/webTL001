import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));
const errors = [], results = [], titles = new Set();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const ids = new Map(pages.map(page => [page, new Set([...read(page).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]))]));
let internalLinks = 0, schemas = 0, images = 0;
for (const page of pages) {
  const html = read(page), fail = message => errors.push(`${page}: ${message}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  const isRedirect = page === 'facai-transporte.html';
  if (!/<html lang="es-CL"/.test(html)) fail('Idioma ausente');
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  if (!title) fail('Falta title');
  if (!isRedirect && titles.has(title)) fail('Title duplicado');
  titles.add(title);
  if (!canonical) fail('Falta canonical');
  if (!isRedirect && (html.match(/<h1(?:>|\s)/g) || []).length !== 1) fail('Debe tener exactamente un h1');
  if (!isRedirect && !/<meta name="description" content="[^"]+"/.test(html)) fail('Falta description');
  if (html.includes('56934691291')) fail('Teléfono comercial antiguo');
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (allIds.length !== new Set(allIds).size) fail('IDs duplicados');
  for (const match of html.matchAll(/<(?:a|img|script|link|source)\b[^>]*?\b(?:href|src)="([^"]*)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    const [fileQuery, anchor] = url.split('#'), file = decodeURI(fileQuery.split('?')[0] || page);
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) { fail(`Ruta fuera del sitio: ${url}`); continue; }
    if (!fs.existsSync(target)) fail(`Recurso ausente: ${url}`);
    if (anchor && file.endsWith('.html') && !ids.get(file)?.has(anchor)) fail(`Ancla ausente: ${url}`);
    internalLinks++;
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    images++;
    if (!/\balt="[^"]*"/.test(match[0])) fail('Imagen sin alt');
    if (!/\bwidth="\d+"/.test(match[0]) || !/\bheight="\d+"/.test(match[0])) fail('Imagen sin dimensiones');
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@context'] !== 'https://schema.org') fail('Contexto JSON-LD incorrecto');
      const org = data['@graph'].find(item => item['@type'] === 'Organization');
      if (org?.telephone !== '+56948004839') fail('Teléfono JSON-LD incorrecto');
      schemas++;
    } catch { fail('JSON-LD inválido'); }
  }
  results.push({ page, title, canonical: canonical?.[1], bytes: Buffer.byteLength(html) });
}
for (const file of ['assets/site.js', 'assets/configuracion.js']) {
  try { new vm.Script(read(file), { filename: file }); } catch (error) { errors.push(`${file}: ${error.message}`); }
}
const css = read('assets/site.css');
for (const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
  if (!fs.existsSync(path.join(root, 'assets', match[1]))) errors.push(`CSS: recurso ausente ${match[1]}`);
}
const sitemap = read('sitemap.xml');
for (const row of results.filter(row => row.page !== 'facai-transporte.html' && row.page !== '404.html')) {
  if (!sitemap.includes(`<loc>${row.canonical}</loc>`)) errors.push(`Sitemap: falta ${row.page}`);
}
const report = { generatedAt: new Date().toISOString(), status: errors.length ? 'FAIL' : 'PASS', pages: results.length, canonicalPages: schemas, internalReferencesChecked: internalLinks, imageInstancesChecked: images, errors, details: results, scope: 'Validación estática local. No certifica indexación, ranking, rich results ni Core Web Vitals de producción.' };
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/validation.json'), JSON.stringify(report, null, 2));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${results.length} páginas, ${schemas} JSON-LD, ${internalLinks} referencias internas, ${images} imágenes. Sin enlaces o anclas rotos.`);
