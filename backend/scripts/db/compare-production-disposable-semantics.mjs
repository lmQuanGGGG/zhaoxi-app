import fs from "node:fs";
import path from "node:path";
const prod = JSON.parse(fs.readFileSync(path.resolve("artifacts/schema/production-schema-full.json"), "utf8"));
const disp = JSON.parse(fs.readFileSync(path.resolve("artifacts/schema/disposable-schema-full.json"), "utf8"));
const normSpace = s => String(s ?? "").replace(/"public"\./gi, "").replace(/\bpublic\./gi, "").replace(/"/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const checkSig = x => `${x.table_name}|${normSpace(x.definition)}`;
const checkSet = snap => new Set(snap.constraints.filter(x => x.constraint_type === "c").map(checkSig));
const pChecks = checkSet(prod), dChecks = checkSet(disp);
const prodOnlyChecks = [...pChecks].filter(x => !dChecks.has(x));
const dispOnlyChecks = [...dChecks].filter(x => !pChecks.has(x));
const notNullColumns = snap => {
  const byTable = new Map();
  for (const c of snap.columns || []) {
    if (String(c.table_schema || '').toLowerCase() !== 'public') continue;
    if (String(c.is_nullable || '').toLowerCase() !== 'no') continue;
    if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Set());
    byTable.get(c.table_name).add(String(c.column_name).toLowerCase());
  }
  return byTable;
};
const normalizeNullOrderingForNotNullColumns = (definition, tableName, notNullByTable) => {
  const cols = notNullByTable.get(tableName) || new Set();
  return definition.replace(/\b([a-z_][a-z0-9_]*)\s+(asc|desc)\s+nulls\s+(first|last)\b/gi, (m, col, dir) =>
    cols.has(String(col).toLowerCase()) ? `${String(col).toLowerCase()} ${String(dir).toLowerCase()}` : m.toLowerCase()
  );
};
const pNotNull = notNullColumns(prod), dNotNull = notNullColumns(disp);
const indexSig = (x, notNullByTable) => {
  let d = normSpace(x.definition);
  d = d.replace(/^create unique index \S+ on /, "create unique index on ").replace(/^create index \S+ on /, "create index on ");
  d = normalizeNullOrderingForNotNullColumns(d, x.table_name, notNullByTable);
  return `${x.table_name}|${d}`;
};
const pIdx = new Set(prod.indexes.map(x => indexSig(x, pNotNull))), dIdx = new Set(disp.indexes.map(x => indexSig(x, dNotNull)));
const prodOnlyIndexes = [...pIdx].filter(x => !dIdx.has(x));
const dispOnlyIndexes = [...dIdx].filter(x => !pIdx.has(x));
// Seven legacy UNIQUE constraints in production are intentionally represented by canonical unique indexes.
const historicalUniqueTables = new Set(["beta_access","onboarding_applications","restaurant_coupons","restaurant_settlements","support_knowledge_articles","support_tags","support_thread_tags"]);
const historicalUniqueCount = prod.constraints.filter(x => x.constraint_type === "u" && historicalUniqueTables.has(x.table_name)).length;
const report = {
  production: prod.counts, disposable: disp.counts,
  productionOnlyChecks: prodOnlyChecks, disposableOnlyChecks: dispOnlyChecks,
  productionOnlyIndexes: prodOnlyIndexes, disposableOnlyIndexes: dispOnlyIndexes,
  informationalHistoricalUniqueConstraints: historicalUniqueCount,
};
fs.writeFileSync(path.resolve("artifacts/schema/production-disposable-semantic-diff.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`SEMANTIC_CHECK_DRIFT=${prodOnlyChecks.length + dispOnlyChecks.length} SEMANTIC_INDEX_DRIFT=${prodOnlyIndexes.length + dispOnlyIndexes.length} HISTORICAL_UNIQUE_INFO=${historicalUniqueCount}`);
if (prodOnlyChecks.length || dispOnlyChecks.length || prodOnlyIndexes.length || dispOnlyIndexes.length) {
  console.error("ZhaoXi 19.0.0 production/disposable semantic convergence FAIL.");
  process.exit(10);
}
console.log("ZhaoXi 19.0.0 production/disposable semantic convergence PASS: checks and indexes equivalent; 7 legacy unique-constraint representations informational only.");
