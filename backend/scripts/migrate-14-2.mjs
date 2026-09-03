import "dotenv/config";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
config({ path: ".env.local", override: false });
const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Missing PostgreSQL connection environment variable.");
const sql = postgres(url, { max: 1, prepare: false });
try {
  const migration = await readFile(new URL("../migrations/0003_unified_auth_sessions.sql", import.meta.url), "utf8");
  await sql.unsafe(migration);
  console.log("Sprint 14.2 unified authentication/session migration applied.");
} finally { await sql.end(); }
