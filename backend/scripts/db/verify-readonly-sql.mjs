import fs from 'node:fs';
import path from 'node:path';
const files = [
  'scripts/db/inspect-production-schema.mjs',
  'scripts/db/inspect-production-schema-full.mjs',
];
const forbidden = /\b(insert|update|delete|create|alter|drop|truncate|grant|revoke|comment|vacuum|analyze|refresh|call|do)\b/i;
let failed=false;
for(const rel of files){
  const p=path.resolve(rel); if(!fs.existsSync(p)) continue;
  const src=fs.readFileSync(p,'utf8');
  const blocks=[...src.matchAll(/sql`([\s\S]*?)`/g)].map(m=>m[1]);
  for(const [i,b] of blocks.entries()) if(forbidden.test(b)){console.error(`READ_ONLY_VERIFY_FAIL ${rel} sql-block=${i+1}`);failed=true;}
}
if(failed) process.exit(2);
console.log('ZhaoXi Sprint B1.1 read-only SQL verification PASS: no mutating SQL detected in schema inspectors.');
