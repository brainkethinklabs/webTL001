import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read = path => fs.readFileSync(path, 'utf8');
new vm.Script(read('assets/analytics.js'));
for (const name of fs.readdirSync('.').filter(name => name.endsWith('.html') && name !== 'facai-transporte.html')) {
  const html = read(name);
  assert(html.includes('name="referrer" content="strict-origin-when-cross-origin"'), name + ': referrer policy missing');
  assert(!/<form[^>]*action="https?:/i.test(html), name + ': unexpected external form');
  assert(!/<iframe/i.test(html), name + ': unexpected embedded content');
  assert(!/(github_pat_|ghp_)[A-Za-z0-9_]{20,}/.test(html), name + ': possible secret');
  assert(html.includes('assets/analytics.js'), name + ': analytics missing');
}
const analytics = read('assets/analytics.js');
assert(analytics.includes("send_page_view: false"));
assert(analytics.includes("ad_storage: 'denied'"));
assert(analytics.includes("if (!production || !enabled || !allowed.has(name)) return"));
assert(!analytics.includes('FormData'));
assert(!analytics.includes('searchParams'));
console.log('Security checks: consent gating, local resources, referrer policy and secret patterns PASS. HTTP headers require separate production verification.');
