import { readdir, readFile, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
// Allowlisted deployment only: no backups, QA, source scripts or development tools.
const files = new Set((await readdir(root)).filter(name => name.endsWith('.html')));
['robots.txt', 'sitemap.xml', '.nojekyll', 'favicon.ico', 'CNAME'].forEach(name => files.add(name));
for (const page of [...files].filter(name => name.endsWith('.html'))) {
  const html = await readFile(path.join(root, page), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)(?:[?#][^"]*)?"/g)) files.add(decodeURI(match[1]));
}
files.add('assets/facai-logo-color.png'); // Organization schema
files.add('assets/hero-truck-crop.jpg'); // Social share image
files.add('assets/fonts/inter-latin.woff2');
files.add('assets/vendor/BOOTSTRAP-ICONS-LICENSE.txt');
const config = await readFile(path.join(root, 'assets/configuracion.js'), 'utf8');
for (const match of config.matchAll(/['"](assets\/clientes\/[a-zA-Z0-9_./-]+\.(?:png|webp|svg|jpg))['"]/g)) {
  // Comments may contain examples; include only files that exist.
  try { await readFile(path.join(root, match[1])); files.add(match[1]); } catch {}
}
// Explicit lazy-loaded runtime assets. Never publish source geodata archives.
for (const file of ['map.js','route-utils.js','data/map-style.json','data/comunas.json','data/regiones.geojson','data/poi.geojson','data/chile-contorno.svg','vendor/maplibre-gl.mjs','vendor/maplibre-gl-worker.mjs','vendor/maplibre-gl-shared.mjs','vendor/maplibre-gl.css','vendor/MAPLIBRE-LICENSE.txt']) files.add('assets/'+file);
// Delete only the generated directory after checking its resolved workspace boundary.
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Unsafe output directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of files) {
  if (path.isAbsolute(file) || file.split(/[\\/]/).some(part => part === '..' || part.startsWith('.git'))) throw new Error('Unsafe public asset path');
  const target = path.join(out, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
await writeFile(path.join(root, 'docs/build-manifest.json'), JSON.stringify({ files: [...files].sort() }, null, 2));
console.log(`Build completo: ${files.size} archivos en dist/ (sin dependencias de producción).`);
