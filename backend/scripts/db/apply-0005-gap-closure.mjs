import fs from "node:fs";
import crypto from "node:crypto";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const migrationPath = "migrations/0005_release_19_production_gap_closure.sql";
const manifest = JSON.parse(fs.readFileSync("migrations/manifest-19.0.0.json", "utf8"));
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const hash = crypto.createHash("sha256").update(migrationSql).digest("hex");
if (hash !== manifest.sha256) throw new Error("Migration checksum mismatch; refuse to continue.");

const connection = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connection) throw new Error("DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING, DATABASE_URL, or POSTGRES_URL is required");
const sql = postgres(connection, { max: 1, prepare: false });
const targets = manifest.targets;
const dependencies = ["users", "organizations", "service_requests", "driver_profiles", "delivery_jobs"];

async function liveState(tx) {
  const rows = await tx`
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
    order by tablename
  `;
  const names = new Set(rows.map((r) => r.tablename));
  const drizzle = await tx`
    select schemaname, tablename
    from pg_catalog.pg_tables
    where tablename = '__drizzle_migrations'
  `;
  const uuidFn = await tx`select to_regprocedure('gen_random_uuid()')::text as fn`;
  return { names, drizzle, uuidFn: uuidFn[0]?.fn };
}

try {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(19000052)`;
    const state = await liveState(tx);
    const presentTargets = targets.filter((t) => state.names.has(t));
    const missingDeps = dependencies.filter((t) => !state.names.has(t));
    const publicCount = state.names.size;

    console.log(`B2A preflight: public_tables=${publicCount} targets_present=${presentTargets.length} dependencies_missing=${missingDeps.length} drizzle_ledgers=${state.drizzle.length}`);
    if (publicCount !== manifest.baselinePublicTables) throw new Error(`Expected ${manifest.baselinePublicTables} public tables before B2A, found ${publicCount}. Re-run B1 reconciliation.`);
    if (presentTargets.length) throw new Error(`Refuse partial/duplicate apply; target tables already present: ${presentTargets.join(", ")}`);
    if (missingDeps.length) throw new Error(`Required dependency tables are missing: ${missingDeps.join(", ")}`);
    if (state.drizzle.length) throw new Error("A Drizzle migration ledger now exists; migration history changed since B1. Refuse one-shot apply.");
    if (!state.uuidFn) throw new Error("gen_random_uuid() is unavailable; refuse apply.");

    if (!APPLY) {
      console.log(`ZhaoXi 19.0.0 Sprint B2A PRECHECK PASS: 84-table baseline, 6 targets absent, dependencies present, no Drizzle ledger, checksum ${hash}.`);
      return;
    }
    if (process.env.ZHAOXI_B2A_APPLY !== "YES_0005_PRODUCTION_GAP_CLOSURE") throw new Error("Apply confirmation missing. Set ZHAOXI_B2A_APPLY=YES_0005_PRODUCTION_GAP_CLOSURE and rerun with --apply.");

    await tx.unsafe(migrationSql);
    const after = await liveState(tx);
    const missingAfter = targets.filter((t) => !after.names.has(t));
    if (after.names.size !== manifest.expectedPublicTablesAfter || missingAfter.length) {
      throw new Error(`Post-apply verification failed inside transaction: public_tables=${after.names.size}, missing_targets=${missingAfter.join(",") || "none"}`);
    }
    console.log(`ZhaoXi 19.0.0 Sprint B2A APPLY PASS: 0005 created 6 target tables atomically; public_tables=${after.names.size}.`);
  });
} finally {
  await sql.end({ timeout: 5 });
}
