import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";

const EXPECTED_DB = "zhaoxi_b2b_empty";
const CONFIRM = "YES_DISPOSABLE_BASELINE";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required. Use --env-file=.env.disposable.local.");
const url = new URL(databaseUrl);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (dbName !== EXPECTED_DB) throw new Error(`REFUSED: target database must be ${EXPECTED_DB}; got ${dbName || "<empty>"}.`);
if (process.env.ZHAOXI_B2B_DISPOSABLE_APPLY !== CONFIRM) throw new Error(`REFUSED: set ZHAOXI_B2B_DISPOSABLE_APPLY=${CONFIRM} before replay.`);

const canonicalDir = path.resolve("migrations/canonical/19.0.0");
const manifestPath = path.join(canonicalDir, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("Canonical manifest missing. Run package-canonical-release.mjs first.");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const baselinePath = path.join(canonicalDir, manifest.baseline.file);
const baselineSql = fs.readFileSync(baselinePath, "utf8");
const actualHash = crypto.createHash("sha256").update(baselineSql).digest("hex");
if (actualHash !== manifest.baseline.sha256) throw new Error(`REFUSED: baseline checksum mismatch. expected=${manifest.baseline.sha256} actual=${actualHash}`);

const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5, ssl: "require" });
try {
  const [identity] = await sql`select current_database() as database`;
  const [before] = await sql`select count(*)::int as public_tables from pg_catalog.pg_tables where schemaname='public'`;
  const [enumBefore] = await sql`select count(distinct t.oid)::int as public_enums from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'`;
  console.log(`B2B canonical replay preflight: database=${identity.database} public_tables=${before.public_tables} public_enums=${enumBefore.public_enums} baseline_sha256=${actualHash}`);
  if (identity.database !== EXPECTED_DB || before.public_tables !== 0 || enumBefore.public_enums !== 0) throw new Error("REFUSED: disposable database is not an empty expected target.");
  const statements = baselineSql.split(/-->\s*statement-breakpoint\s*/i).map(s => s.trim()).filter(Boolean);
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(190005::bigint)`;
    for (let i = 0; i < statements.length; i++) {
      try { await tx.unsafe(statements[i]); }
      catch (error) { error.message = `Statement ${i + 1}/${statements.length} failed: ${error.message}`; throw error; }
    }
    const [after] = await tx`select count(*)::int as n from pg_catalog.pg_tables where schemaname='public'`;
    const [cols] = await tx`select count(*)::int as n from information_schema.columns where table_schema='public'`;
    const [enums] = await tx`select count(distinct t.oid)::int as n from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'`;
    if (after.n !== 90 || cols.n !== 917 || enums.n !== 4) throw new Error(`Post-check failed: tables=${after.n} columns=${cols.n} enums=${enums.n}`);
  });
  console.log("ZhaoXi 19.0.0 canonical DISPOSABLE REPLAY PASS: public_tables=90, public_columns=917, public_enums=4.");
} finally { await sql.end({ timeout: 5 }); }
