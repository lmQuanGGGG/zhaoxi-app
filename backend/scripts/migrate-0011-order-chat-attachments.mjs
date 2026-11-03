// Applies migrations/0011_order_message_attachments.sql (order chat photos) in one transaction.
// Additive and idempotent. `node scripts/migrate-0011-order-chat-attachments.mjs --check` only reports state.
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
const tables = async () => (await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('order_conversations', 'order_messages', 'order_message_attachments') order by 1`).map((row) => row.table_name);

try {
  console.log("Order chat tables before:", (await tables()).join(", ") || "none");
  if (!checkOnly) {
    const ddl = readFileSync(new URL("../migrations/0011_order_message_attachments.sql", import.meta.url), "utf8");
    await sql.begin(async (tx) => { await tx.unsafe(ddl); });
    const indexes = await sql`select indexname from pg_indexes where tablename = 'order_message_attachments' order by 1`;
    console.log("Order chat tables after:", (await tables()).join(", "));
    console.log("Indexes:", indexes.map((row) => row.indexname).join(", "));
    console.log("Order chat attachments migration applied.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
