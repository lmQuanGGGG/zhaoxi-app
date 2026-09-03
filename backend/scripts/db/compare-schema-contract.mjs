import fs from 'node:fs';
import path from 'node:path';

const prodPath = path.resolve('artifacts/schema/production-schema.json');
const declaredPath = path.resolve('artifacts/schema/declared-table-inventory.json');
for (const p of [prodPath, declaredPath]) {
  if (!fs.existsSync(p)) {
    console.error(`ERROR: missing ${p}`);
    process.exit(2);
  }
}
const prod = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
const declared = JSON.parse(fs.readFileSync(declaredPath, 'utf8'));
const prodTables = new Set((prod.tables || []).filter(t => t.schema_name === 'public').map(t => t.table_name));
const declaredTables = new Set(declared.tables || []);
const missingInProduction = [...declaredTables].filter(x => !prodTables.has(x)).sort();
const extraInProduction = [...prodTables].filter(x => !declaredTables.has(x)).sort();
const matching = [...declaredTables].filter(x => prodTables.has(x)).sort();
const result = {
  generatedAt: new Date().toISOString(),
  scope: 'TABLE_LEVEL_ONLY',
  note: 'Column/index/constraint metadata is captured in production-schema.json but not auto-compared in B1.',
  counts: {
    declared: declaredTables.size,
    productionPublic: prodTables.size,
    matching: matching.length,
    missingInProduction: missingInProduction.length,
    extraInProduction: extraInProduction.length,
  },
  matching,
  missingInProduction,
  extraInProduction,
};
const outPath = path.resolve('artifacts/schema/schema-table-diff.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Schema table diff written: ${outPath}`);
console.log(`MATCH=${matching.length} MISSING_IN_PRODUCTION=${missingInProduction.length} EXTRA_IN_PRODUCTION=${extraInProduction.length}`);
if (missingInProduction.length || extraInProduction.length) process.exitCode = 10;
