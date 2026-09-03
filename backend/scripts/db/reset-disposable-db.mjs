import postgres from "postgres";
const EXPECTED_DB = "zhaoxi_b2b_empty";
const CONFIRM = "YES_RESET_ZHAOXI_B2B_EMPTY";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required. Use --env-file=.env.disposable.local.");
const url = new URL(databaseUrl);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (dbName !== EXPECTED_DB) throw new Error(`REFUSED: target database must be ${EXPECTED_DB}; got ${dbName || "<empty>"}.`);
if (process.env.ZHAOXI_B2B_DISPOSABLE_RESET !== CONFIRM) throw new Error(`REFUSED: set ZHAOXI_B2B_DISPOSABLE_RESET=${CONFIRM}.`);
const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5, ssl: "require" });
try {
  const [identity] = await sql`select current_database() as database`;
  if (identity.database !== EXPECTED_DB) throw new Error(`REFUSED: current_database()=${identity.database}.`);
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(190004::bigint)`;
    await tx.unsafe('drop schema if exists public cascade');
    await tx.unsafe('create schema public');
    await tx.unsafe('grant all on schema public to public');
  });
  const [tables] = await sql`select count(*)::int as n from pg_catalog.pg_tables where schemaname='public'`;
  const [enums] = await sql`select count(distinct t.oid)::int as n from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'`;
  if (tables.n !== 0 || enums.n !== 0) throw new Error(`Reset post-check failed: tables=${tables.n} enums=${enums.n}`);
  console.log("ZhaoXi 19.0.0 disposable reset PASS: public_tables=0 public_enums=0.");
} finally { await sql.end({ timeout: 5 }); }
