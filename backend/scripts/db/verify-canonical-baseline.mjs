import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const outDir = path.resolve(root, "artifacts/canonical-baseline/19.0.0");
const schemaPath = path.resolve(root, "db/schema.ts");
if (!fs.existsSync(schemaPath) || !fs.existsSync(outDir)) {
  console.error("ERROR: schema or generated baseline directory is missing.");
  process.exit(2);
}
const sqlFiles = fs.readdirSync(outDir).filter((name) => name.endsWith(".sql"));
if (sqlFiles.length !== 1) {
  console.error(`ERROR: expected exactly 1 SQL baseline, found ${sqlFiles.length}.`);
  process.exit(2);
}
const sqlPath = path.join(outDir, sqlFiles[0]);
const sql = fs.readFileSync(sqlPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");

const forbidden = [
  /\bDROP\s+(TABLE|TYPE|SCHEMA|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /(?:^|\n)\s*UPDATE\s+[A-Za-z_"]/im,
  /\bINSERT\s+INTO\b/i,
];
for (const re of forbidden) {
  if (re.test(sql)) {
    console.error(`ERROR: baseline is not schema-only; matched ${re}`);
    process.exit(4);
  }
}

const declared = [...schema.matchAll(/pgTable\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
const declaredUnique = [...new Set(declared)].sort();
const created = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"public"\.)?"?([A-Za-z0-9_]+)"?/gi)].map((m) => m[1]);
const createdUnique = [...new Set(created)].sort();
const missing = declaredUnique.filter((x) => !createdUnique.includes(x));
const extra = createdUnique.filter((x) => !declaredUnique.includes(x));

const enumNames = [...schema.matchAll(/pgEnum\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
const createdEnums = [...sql.matchAll(/CREATE\s+TYPE\s+(?:\x22[^\x22]+\x22\.)?\x22([^\x22]+)\x22\s+AS\s+ENUM/gi)].map((m) => m[1]);
const missingEnums = enumNames.filter((name) => !createdEnums.includes(name));

const requiredInvariants = [
  { name: "support_satisfaction_rating_check", re: /CONSTRAINT\s+"support_satisfaction_rating_check"\s+CHECK\s*\([^)]*"rating"[^)]*>=\s*1[^)]*<=\s*5[^)]*\)/i },
  { name: "customer_support_threads_assignment_idx", re: /CREATE\s+INDEX\s+"customer_support_threads_assignment_idx"[\s\S]*?\("assigned_admin_user_id","status","last_message_at"\)/i },
  { name: "customer_support_threads_escalation_idx", re: /CREATE\s+INDEX\s+"customer_support_threads_escalation_idx"[\s\S]*?\("escalation_level","status","last_message_at"\)/i },
  { name: "customer_support_threads_priority_idx", re: /CREATE\s+INDEX\s+"customer_support_threads_priority_idx"[\s\S]*?\("priority","status","last_message_at"\)/i },
  { name: "customer_history_user_viewed_idx_desc", re: /CREATE\s+INDEX\s+"customer_history_user_viewed_idx"[\s\S]*?"viewed_at"\s+DESC(?:\s+NULLS\s+LAST)?/i },
];
const missingInvariants = requiredInvariants.filter(({ re }) => !re.test(sql)).map(({ name }) => name);

const hash = crypto.createHash("sha256").update(sql).digest("hex");
const report = {
  generatedFile: sqlFiles[0],
  sha256: hash,
  declaredTables: declaredUnique.length,
  createdTables: createdUnique.length,
  missingTables: missing,
  extraTables: extra,
  declaredEnums: enumNames.length,
  missingEnums,
  missingInvariants,
  schemaOnly: true,
};
fs.writeFileSync(path.join(outDir, "verification.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(path.join(outDir, "baseline.sha256"), hash + "\n");

console.log(`DECLARED_TABLES=${declaredUnique.length} CREATED_TABLES=${createdUnique.length} MISSING=${missing.length} EXTRA=${extra.length} DECLARED_ENUMS=${enumNames.length} MISSING_ENUMS=${missingEnums.length} MISSING_INVARIANTS=${missingInvariants.length}`);
console.log(`BASELINE_SHA256=${hash}`);
if (declaredUnique.length !== 90 || createdUnique.length !== 90 || missing.length || extra.length || missingEnums.length || missingInvariants.length) {
  console.error("ZhaoXi 19.0.0 canonical baseline verification FAIL.");
  process.exit(10);
}
console.log("ZhaoXi 19.0.0 canonical baseline verification PASS: 90 tables, 4 enums, 5 production invariants, schema-only SQL.");
