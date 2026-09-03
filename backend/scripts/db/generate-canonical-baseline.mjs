import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = path.resolve(root, "artifacts/canonical-baseline/19.0.0");
const config = path.resolve(root, "scripts/db/drizzle-baseline.config.ts");
const schema = path.resolve(root, "db/schema.ts");

for (const required of [config, schema]) {
  if (!fs.existsSync(required)) {
    console.error(`ERROR: missing ${required}`);
    process.exit(2);
  }
}

if (fs.existsSync(outDir)) {
  const existing = fs.readdirSync(outDir).filter((name) => name !== ".gitkeep");
  if (existing.length > 0) {
    console.error(`ERROR: ${outDir} is not empty.`);
    console.error("Delete only artifacts\\canonical-baseline\\19.0.0 and rerun if you intentionally want a fresh generation.");
    process.exit(3);
  }
} else {
  fs.mkdirSync(outDir, { recursive: true });
}

const pkgPath = path.resolve(root, "node_modules/drizzle-kit/package.json");
if (!fs.existsSync(pkgPath)) {
  console.error(`ERROR: local drizzle-kit package not found: ${pkgPath}`);
  console.error("Run npm install first; do not use a globally installed migration tool for this gate.");
  process.exit(4);
}
const drizzlePackage = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const binField = typeof drizzlePackage.bin === "string" ? drizzlePackage.bin : drizzlePackage.bin?.["drizzle-kit"];
if (!binField) {
  console.error("ERROR: drizzle-kit package does not expose a drizzle-kit binary entrypoint.");
  process.exit(4);
}
const drizzleEntry = path.resolve(root, "node_modules/drizzle-kit", binField);
if (!fs.existsSync(drizzleEntry)) {
  console.error(`ERROR: drizzle-kit entrypoint not found: ${drizzleEntry}`);
  process.exit(4);
}

const env = { ...process.env };
for (const key of [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
]) delete env[key];

console.log("B2B canonical baseline generation: database credentials removed from child environment.");
const result = spawnSync(process.execPath, [drizzleEntry, "generate", `--config=${config}`], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(result.error);
  process.exit(5);
}
if (result.status !== 0) process.exit(result.status ?? 6);

const sqlFiles = fs.readdirSync(outDir).filter((name) => name.endsWith(".sql"));
if (sqlFiles.length !== 1) {
  console.error(`ERROR: expected exactly 1 generated SQL baseline, found ${sqlFiles.length}.`);
  process.exit(7);
}
console.log(`ZhaoXi 19.0.0 canonical baseline generation PASS: ${sqlFiles[0]}`);
