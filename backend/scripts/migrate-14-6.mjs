import "dotenv/config";
import postgres from "postgres";
const connection = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connection) throw new Error("DATABASE_URL or POSTGRES_URL is required");
const sql = postgres(connection, { max: 1, prepare: false });
try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS driver_location_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
      job_id uuid REFERENCES delivery_jobs(id) ON DELETE CASCADE,
      latitude numeric(10,7) NOT NULL,
      longitude numeric(10,7) NOT NULL,
      accuracy_meters numeric(10,2),
      heading numeric(8,2),
      speed_mps numeric(10,2),
      recorded_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS driver_location_history_driver_idx ON driver_location_history(driver_id);
    CREATE INDEX IF NOT EXISTS driver_location_history_job_idx ON driver_location_history(job_id);
    CREATE INDEX IF NOT EXISTS driver_location_history_recorded_idx ON driver_location_history(recorded_at);
  `);
  console.log("Sprint 14.6 realtime GPS migration applied.");
} finally { await sql.end({ timeout: 5 }); }
