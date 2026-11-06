import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveCommune, estimateTruckTime} from '../assets/route-utils.js';
const json=async name=>JSON.parse(await readFile(new URL('../assets/data/'+name,import.meta.url),'utf8'));
const communes=await json('comunas.json'),regions=await json('regiones.geojson'),poi=await json('poi.geojson');
assert.equal(communes.length,346);assert.equal(new Set(communes.map(c=>c.codigo)).size,346);
assert.equal(regions.features.length,16);assert.equal(poi.features.length,84);
assert.equal(new Set(poi.features.map(f=>f.id)).size,84);
for(const c of communes){assert.match(c.codigo,/^\d{5}$/);if(c.routable){assert.ok(Number.isFinite(c.lat)&&Number.isFinite(c.lng));assert.ok(c.lat<-17&&c.lat>-57);}}
for(const f of poi.features){assert.equal(f.geometry.type,'Point');assert.ok(f.properties.fuente&&f.properties.nota);assert.match(f.properties.url,/^https:\/\//);assert.ok(f.geometry.coordinates.every(Number.isFinite));}
assert.equal(resolveCommune(communes,'  concepcion ').nombre,'Concepción');
assert.equal(resolveCommune(communes,'Antartica').routable,false);
assert.equal(resolveCommune(communes,'Coihaique').nombre,'Coyhaique');
assert.equal(resolveCommune(communes,'Rapa Nui').routable,false);
assert.equal(resolveCommune(communes,'Puerto Aysen').nombre,'Aysén');
assert.equal(resolveCommune(communes,'comuna inexistente'),null);
assert.equal(resolveCommune([{nombre:'San Pedro',region:'A'},{nombre:'San Pedro',region:'B'}],'San Pedro'),null);
assert.equal(resolveCommune([{nombre:'San Pedro',region:'A'},{nombre:'San Pedro',region:'B'}],'San Pedro · B').region,'B');
assert.deepEqual(estimateTruckTime(650000,3600),{kilometers:650,minutes:600});
assert.deepEqual(estimateTruckTime(65000,36000),{kilometers:65,minutes:810});
assert.throws(()=>estimateTruckTime(NaN,10));assert.throws(()=>estimateTruckTime(10,-5));
console.log('PASS: 346 comunas, 16 regiones, 84 POI; selección inequívoca y cálculo orientativo verificados.');
