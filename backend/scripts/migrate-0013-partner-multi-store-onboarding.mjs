// Applies migrations/0013_partner_multi_store_onboarding.sql in one transaction.
// Idempotent. `node scripts/migrate-0013-partner-multi-store-onboarding.mjs --check` only reports state.
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
const indexes = async () => (await sql`select indexname from pg_indexes where tablename = 'onboarding_applications' order by 1`).map((row) => row.indexname);

try {
  console.log("onboarding_applications indexes before:", (await indexes()).join(", "));
  if (!checkOnly) {
    const ddl = readFileSync(new URL("../migrations/0013_partner_multi_store_onboarding.sql", import.meta.url), "utf8");
    await sql.begin(async (tx) => { await tx.unsafe(ddl); });
    console.log("onboarding_applications indexes after:", (await indexes()).join(", "));
    console.log("Partner multi-store onboarding migration applied.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
