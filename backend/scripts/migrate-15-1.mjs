import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.DATABASE_URL_UNPOOLED
  || process.env.POSTGRES_URL_NON_POOLING
  || process.env.POSTGRES_URL
  || process.env.DATABASE_URL;

if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is required');

const sql = postgres(url, { ssl: 'require', max: 1, prepare: false });
try {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS runtime_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), app varchar(24) NOT NULL, environment varchar(24) NOT NULL DEFAULT 'production', severity varchar(16) NOT NULL DEFAULT 'error', event_type varchar(64) NOT NULL DEFAULT 'runtime_error', message text NOT NULL, digest varchar(180), route text, release varchar(40) NOT NULL DEFAULT '15.1.0', user_agent text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS runtime_events_created_idx ON runtime_events(created_at); CREATE INDEX IF NOT EXISTS runtime_events_app_idx ON runtime_events(app); CREATE INDEX IF NOT EXISTS runtime_events_severity_idx ON runtime_events(severity); CREATE INDEX IF NOT EXISTS runtime_events_type_idx ON runtime_events(event_type);`);
  console.log('Sprint 15.1 observability migration applied.');
} finally {
  await sql.end({ timeout: 5 });
}
