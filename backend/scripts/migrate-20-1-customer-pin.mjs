import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const sql = postgres(url, { ssl: "require", max: 1, prepare: false });
try {
  await sql.unsafe(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
  `);
  console.log("Customer PIN migration applied.");
} finally {
  await sql.end({ timeout: 5 });
}
