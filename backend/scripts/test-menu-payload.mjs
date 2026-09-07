import assert from 'node:assert/strict';

// Read-only integration check; point at a running backend with existing menus.
const base = process.env.TEST_BACKEND_URL || 'http://localhost:3109';
const response = await fetch(`${base}/api/services?module=food`);
assert.equal(response.status, 200);
const text = await response.text();
const { data } = JSON.parse(text);
assert.ok(data.length > 0, 'test requires menu fixtures');
assert.ok(Buffer.byteLength(text) < 2_000_000, 'menu response should not embed repeated QR bytes');
for (const row of data) assert.ok(!String(row.organizationMetadata?.paymentQrUrl).startsWith('data:'));
const urls = [...new Set(data.map(row => row.organizationMetadata?.paymentQrUrl).filter(Boolean))];
for (const url of urls) {
  const image = await fetch(url);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /^image\//);
  assert.ok((await image.arrayBuffer()).byteLength > 0);
}
assert.equal((await fetch(`${base}/api/organization-payment-qr?id=invalid`)).status, 400);
assert.equal((await fetch(`${base}/api/organization-payment-qr?id=00000000-0000-0000-0000-000000000000`)).status, 404);
console.log(`PASS ${data.length} menu rows, ${Buffer.byteLength(text)} JSON bytes, ${urls.length} QR URLs`);
