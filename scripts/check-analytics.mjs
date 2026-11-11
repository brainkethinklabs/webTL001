import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Execute the real tracking script without network access or visitor data.
const source = readFileSync(new URL('../assets/analytics.js', import.meta.url), 'utf8');
function run(search, consent = 'yes', hostname = 'facai.cl') {
  const listeners = {}, appended = [];
  const panel = { setAttribute() {}, querySelectorAll: () => [], querySelector: () => ({ focus() {} }) };
  const context = {
    URL, URLSearchParams,
    location: { hostname, origin: 'https://' + hostname, pathname: '/', search },
    localStorage: { getItem: () => consent },
    document: {
      title: 'FACAI', referrer: 'https://www.linkedin.com/feed/?private=test',
      querySelector: () => ({ href: 'https://facai.cl/' }),
      querySelectorAll: () => [],
      createElement: tag => tag === 'section' ? panel : {},
      head: { append: value => appended.push(value) }, body: { append() {} },
      addEventListener: (event, fn) => { listeners[event] = fn; }
    }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  listeners['facai:measurement']({ detail: { name: 'quote_prepared', email: 'do-not-send@example.invalid', origen: 'private-origin' } });
  return { commands: context.dataLayer.map(args => Array.from(args)), appended };
}
const valid = run('?utm_source=linkedin&utm_medium=organic_social&utm_campaign=posicionamiento_facai&utm_content=perfil&email=private@example.invalid&origen=private-origin');
const config = valid.commands.find(row => row[0] === 'config')[2];
assert.equal(config.campaign_source, 'linkedin');
assert.equal(config.campaign_medium, 'organic_social');
assert.equal(config.campaign_name, 'posicionamiento_facai');
assert.equal(config.campaign_content, 'perfil');
assert.equal(config.page_location, 'https://facai.cl/');
assert.equal(config.page_referrer, 'https://www.linkedin.com');
assert.equal(valid.appended.length, 1);
assert.doesNotMatch(JSON.stringify(valid.commands), /private|example.invalid/);
for (const query of [
  '?utm_source=linkedin&utm_medium=organic_social&utm_campaign=personal-name',
  '?utm_source=unknown&utm_medium=organic_social&utm_campaign=posicionamiento_facai',
  '?utm_source=linkedin&utm_medium=cpc&utm_campaign=posicionamiento_facai',
  '?utm_source=__proto__&utm_medium=x&utm_campaign=posicionamiento_facai'
]) assert.equal(run(query).commands.find(row => row[0] === 'config')[2].campaign_source, undefined);
for (const consent of ['no', null]) {
  const result = run('?utm_source=instagram&utm_medium=organic_social&utm_campaign=posicionamiento_facai', consent);
  assert.equal(result.appended.length, 0);
  assert.equal(result.commands.some(row => ['config', 'event'].includes(row[0])), false);
}
assert.equal(run('', 'yes', 'localhost').appended.length, 0);
console.log('PASS: campaign attribution, consent gating and exclusion of private query/form data.');
