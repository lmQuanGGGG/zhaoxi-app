import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!url) throw new Error("POSTGRES_URL or DATABASE_URL is required");

const sql = postgres(url, { ssl: "require", max: 1, prepare: false });

try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS phone_otp_registrations (
      phone varchar(30) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider varchar(32) NOT NULL,
      provider_message_id varchar(160),
      sent_at timestamptz NOT NULL DEFAULT now(),
      verified_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS phone_otp_registrations_user_idx
      ON phone_otp_registrations(user_id);
  `);
  console.log("Unimatrix one-time phone OTP migration applied.");
} finally {
  await sql.end({ timeout: 5 });
}
