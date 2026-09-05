import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const sql = postgres(url, { ssl: "require", max: 1, prepare: false });
try {
  await sql.unsafe(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(64);
    CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_ci_idx
      ON users (lower(username)) WHERE username IS NOT NULL;
  `);
  console.log("Username authentication migration applied.");
} finally {
  await sql.end({ timeout: 5 });
}
