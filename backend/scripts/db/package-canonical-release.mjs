import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const generatedDir = path.resolve(root, "artifacts/canonical-baseline/19.0.0");
const canonicalDir = path.resolve(root, "migrations/canonical/19.0.0");
const existingManifestPath = path.resolve(root, "migrations/canonical/19.0.0/manifest.json");
if (fs.existsSync(existingManifestPath)) {
  const existingManifest = JSON.parse(fs.readFileSync(existingManifestPath, "utf8"));
  if (existingManifest.baseline?.sha256) {
    throw new Error("REFUSED: canonical 0000 baseline is frozen. Future schema changes must use forward migrations starting at 0002.");
  }
}

const verificationPath = path.join(generatedDir, "verification.json");
if (!fs.existsSync(verificationPath)) throw new Error("Run verify-canonical-baseline.mjs first.");
const verification = JSON.parse(fs.readFileSync(verificationPath, "utf8"));
if (verification.declaredTables !== 90 || verification.createdTables !== 90 || verification.missingTables?.length || verification.extraTables?.length || verification.missingEnums?.length || verification.missingInvariants?.length) {
  throw new Error("Refused: baseline verification is not GREEN.");
}
const generatedSql = path.join(generatedDir, verification.generatedFile);
const sql = fs.readFileSync(generatedSql, "utf8");
const actual = crypto.createHash("sha256").update(sql).digest("hex");
if (actual !== verification.sha256) throw new Error("Refused: generated baseline hash changed after verification.");
fs.mkdirSync(canonicalDir, { recursive: true });
const target = path.join(canonicalDir, "0000_full_schema.sql");
fs.writeFileSync(target, sql);
const bootstrapPath = path.join(canonicalDir, "0001_required_bootstrap.sql");
const optionalPath = path.join(canonicalDir, "optional_seed.sql");
for (const p of [bootstrapPath, optionalPath]) if (!fs.existsSync(p)) throw new Error(`Missing canonical data file: ${p}`);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const manifest = {
  release: "19.0.0",
  architecture: "canonical-baseline-convergence",
  baseline: { file: "0000_full_schema.sql", sha256: sha(target), tables: 90, columns: 917, enums: 4 },
  requiredBootstrap: { file: "0001_required_bootstrap.sql", sha256: sha(bootstrapPath) },
  optionalSeed: { file: "optional_seed.sql", sha256: sha(optionalPath), required: false },
  futureMigrationStart: "0002",
  legacyScriptsRetired: 51,
  drizzleLegacyLedgerBootstrapped: false,
};
fs.writeFileSync(path.join(canonicalDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`ZhaoXi 19.0.0 canonical release packaging PASS: baseline_sha256=${manifest.baseline.sha256} bootstrap_sha256=${manifest.requiredBootstrap.sha256}`);
