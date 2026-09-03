import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import postgres from "postgres";
const EXPECTED_DB = "zhaoxi_b2b_empty";
const CONFIRM = "YES_DISPOSABLE_BOOTSTRAP";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const dbName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
if (dbName !== EXPECTED_DB) throw new Error(`REFUSED: target database must be ${EXPECTED_DB}.`);
if (process.env.ZHAOXI_B2B_DISPOSABLE_BOOTSTRAP !== CONFIRM) throw new Error(`REFUSED: set ZHAOXI_B2B_DISPOSABLE_BOOTSTRAP=${CONFIRM}.`);
const dir = path.resolve("migrations/canonical/19.0.0");
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const p = path.join(dir, manifest.requiredBootstrap.file);
const body = fs.readFileSync(p, "utf8");
const hash = crypto.createHash("sha256").update(body).digest("hex");
if (hash !== manifest.requiredBootstrap.sha256) throw new Error("REFUSED: bootstrap checksum mismatch.");
const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5, ssl: "require" });
try {
  const [tables] = await sql`select count(*)::int as n from pg_catalog.pg_tables where schemaname='public'`;
  if (tables.n !== 90) throw new Error(`REFUSED: expected 90 public tables before bootstrap; got ${tables.n}.`);
  await sql.begin(async tx => { await tx`select pg_advisory_xact_lock(190006::bigint)`; await tx.unsafe(body); });
  console.log(`ZhaoXi 19.0.0 disposable required-bootstrap APPLY PASS: sha256=${hash}`);
} finally { await sql.end({ timeout: 5 }); }
