import fs from "node:fs";
import crypto from "node:crypto";

const migrationPath = "migrations/0005_release_19_production_gap_closure.sql";
const manifestPath = "migrations/manifest-19.0.0.json";
const sql = fs.readFileSync(migrationPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hash = crypto.createHash("sha256").update(sql).digest("hex");
if (hash !== manifest.sha256) throw new Error(`0005 checksum mismatch: expected ${manifest.sha256}, got ${hash}`);

const target = [...manifest.targets].sort();
const created = [...sql.matchAll(/CREATE\s+TABLE\s+([a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase()).sort();
if (JSON.stringify(created) !== JSON.stringify(target)) throw new Error(`0005 target tables mismatch: ${JSON.stringify(created)}`);

const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
for (const statement of statements) {
  if (!/^(CREATE\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX)\b/i.test(statement)) {
    throw new Error(`0005 contains non-additive top-level statement: ${statement.slice(0, 80)}`);
  }
}
if (/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(sql)) throw new Error("0005 must fail closed; CREATE TABLE IF NOT EXISTS is not allowed");
if (/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i.test(sql)) throw new Error("0005 must fail closed; CREATE INDEX IF NOT EXISTS is not allowed");

const requiredFragments = [
  "payment_transactions(request_id)",
  "payment_events(payment_id)",
  "support_messages(conversation_id)",
  "driver_location_history(driver_id)",
  "delivery_job_events(job_id)",
  "ON DELETE CASCADE",
  "ON DELETE SET NULL",
];
for (const fragment of requiredFragments) if (!sql.includes(fragment)) throw new Error(`0005 missing required contract fragment: ${fragment}`);

console.log(`ZhaoXi 19.0.0 Sprint B2A 0005 contract PASS: 6 additive tables, checksum ${hash}, no destructive SQL.`);
