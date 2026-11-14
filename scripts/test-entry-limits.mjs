import assert from 'node:assert/strict';
const base = process.env.GHOSTLINE_TEST_URL || 'http://127.0.0.1:5190';
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(base)) throw new Error('Run the entry-limit check against local development only.');
const headers = { 'content-type': 'application/json', 'cf-connecting-ip': `198.51.100.${1 + Math.floor(Math.random() * 253)}` };
for (let i = 1; i <= 61; i++) {
  const response = await fetch(`${base}/api/radio`, { method: 'POST', headers, body: JSON.stringify({ action: 'join', name: 'Rate check', code: 'NOTAROOM' }) });
  assert.equal(response.status, i <= 60 ? 404 : 429, `attempt ${i}: ${await response.text()}`);
}
const malformed = await fetch(`${base}/api/radio`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'null' });
assert.equal(malformed.status, 400);
console.log('PASS: entry throttling applies atomically and null commands are rejected.');
