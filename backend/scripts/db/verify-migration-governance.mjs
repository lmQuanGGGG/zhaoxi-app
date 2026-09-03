import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.cwd();
const dir = path.resolve(root, "migrations/canonical/19.0.0");
const required = ["0000_full_schema.sql","0001_required_bootstrap.sql","optional_seed.sql","manifest.json","ledger-policy.json","legacy-retirement-map.json"];
const missing = required.filter(f => !fs.existsSync(path.join(dir, f)));
if (missing.length) { console.error(`MISSING_CANONICAL_FILES=${missing.join(",")}`); process.exit(2); }
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const hash = f => crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex");
const failures = [];
if (hash(manifest.baseline.file) !== manifest.baseline.sha256) failures.push("baseline_hash");
if (hash(manifest.requiredBootstrap.file) !== manifest.requiredBootstrap.sha256) failures.push("bootstrap_hash");
if (hash(manifest.optionalSeed.file) !== manifest.optionalSeed.sha256) failures.push("optional_seed_hash");
const retirement = JSON.parse(fs.readFileSync(path.join(dir, "legacy-retirement-map.json"), "utf8"));
if (retirement.legacyScripts?.length !== 51) failures.push(`legacy_count=${retirement.legacyScripts?.length}`);
const policy = JSON.parse(fs.readFileSync(path.join(dir, "ledger-policy.json"), "utf8"));
if (policy.production?.replayBaseline !== false || policy.fresh?.baseline !== "0000_full_schema.sql") failures.push("ledger_policy");
if (failures.length) { console.error(`GOVERNANCE_FAIL=${failures.join(",")}`); process.exit(10); }
console.log("ZhaoXi 19.0.0 canonical migration governance PASS: hashes locked, 51 legacy scripts retired, production baseline replay forbidden, future canonical numbering starts at 0002.");
