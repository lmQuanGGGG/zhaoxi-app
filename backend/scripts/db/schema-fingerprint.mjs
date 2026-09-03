import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const p = path.resolve('artifacts/schema/production-schema-full.json');
if (!fs.existsSync(p)) {
  console.error(`ERROR: missing ${p}`);
  process.exit(2);
}

const snapshot = JSON.parse(fs.readFileSync(p, 'utf8'));
delete snapshot.generatedAt;
delete snapshot.database;
delete snapshot.serverVersion;

const normalized = JSON.stringify(snapshot);
const hash = crypto.createHash('sha256').update(normalized).digest('hex');
const out = path.resolve('artifacts/schema/production-schema-full.sha256');
fs.writeFileSync(out, hash + '\n');
console.log(`Production full-schema fingerprint: ${hash}`);
console.log(`Written: ${out}`);
