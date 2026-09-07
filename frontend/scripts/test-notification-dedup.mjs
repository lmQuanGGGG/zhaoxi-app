import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../apps/partner/app/shared-notification-fetch.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
let calls = 0;
let fail = false;
const context = { exports: {}, AbortSignal, fetch: async () => {
  calls++;
  await new Promise(resolve => setTimeout(resolve, 5));
  if (fail) throw new Error('offline');
  return Response.json({ ok: true, data: [1] });
} };
vm.runInNewContext(outputText, context);
const read = context.exports.sharedNotificationFetch;
const responses = await Promise.all([read('/same'), read('/same'), read('/same')]);
assert.equal(calls, 1);
for (const response of responses) assert.deepEqual(await response.json(), { ok: true, data: [1] });
await read('/same');
assert.equal(calls, 2, 'completed data must not be cached');
await Promise.all([read('/org-a'), read('/org-b')]);
assert.equal(calls, 4, 'organization feeds must stay separate');
fail = true;
await assert.rejects(read('/same'));
fail = false;
assert.equal((await read('/same')).status, 200, 'failed reads must not poison retries');
console.log('PASS notification dedup: concurrent reads, independent bodies, isolation, freshness, retry');
