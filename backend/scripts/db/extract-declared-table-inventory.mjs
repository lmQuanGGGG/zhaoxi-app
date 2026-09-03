import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve('db/schema.ts');
if (!fs.existsSync(schemaPath)) {
  console.error(`ERROR: missing ${schemaPath}`);
  process.exit(2);
}

const source = fs.readFileSync(schemaPath, 'utf8');
const names = new Set();
for (const re of [/pgTable\(\s*["'`]([^"'`]+)["'`]/g, /pgSchema\([^)]*\)\.table\(\s*["'`]([^"'`]+)["'`]/g]) {
  let match;
  while ((match = re.exec(source))) names.add(match[1]);
}

const tables = [...names].sort();
const outDir = path.resolve('artifacts/schema');
fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, 'declared-table-inventory.json');
fs.writeFileSync(target, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'db/schema.ts',
  parser: 'static pgTable/pgSchema.table inventory',
  count: tables.length,
  tables,
}, null, 2) + '\n');
console.log(`Declared table inventory written: ${target}`);
console.log(`Declared tables=${tables.length}`);
if (tables.length === 0) process.exitCode = 3;
