// Applies migrations/0008_customer_mobile_push.sql (customer push tables) in one transaction.
// Additive and idempotent. `node scripts/migrate-0010-order-chat.mjs --check` only reports state.
import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config();
const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");
const checkOnly = process.argv.includes("--check");
const local = /^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname);
const sql = postgres(url, { ssl: local ? false : "require", max: 1, prepare: false });
const tables = async () => (await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('customer_mobile_push_devices') order by 1`).map((row) => row.table_name);

try {
  console.log("Customer push tables before:", (await tables()).join(", ") || "none");
  if (!checkOnly) {
    const ddl = readFileSync(new URL("../migrations/0008_customer_mobile_push.sql", import.meta.url), "utf8");
    await sql.begin(async (tx) => { await tx.unsafe(ddl); });
    const indexes = await sql`select indexname from pg_indexes where tablename in ('customer_mobile_push_devices') order by 1`;
    console.log("Customer push tables after:", (await tables()).join(", "));
    console.log("Indexes:", indexes.map((row) => row.indexname).join(", "));
    console.log("Customer mobile push migration applied.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
