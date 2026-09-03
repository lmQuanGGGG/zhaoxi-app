import "dotenv/config";
import postgres from "postgres";
const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connection) throw new Error("DATABASE_URL or POSTGRES_URL is required");
const sql = postgres(connection, { max: 1, ssl: "require" });
try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      method varchar(32) NOT NULL DEFAULT 'cash_on_delivery',
      provider varchar(32) NOT NULL DEFAULT 'zhaoxi',
      status varchar(32) NOT NULL DEFAULT 'pending',
      amount numeric(14,2) NOT NULL,
      currency varchar(3) NOT NULL DEFAULT 'VND',
      idempotency_key varchar(180) NOT NULL UNIQUE,
      provider_reference varchar(180),
      checkout_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      expires_at timestamptz,
      paid_at timestamptz,
      failed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS payment_transactions_request_idx ON payment_transactions(request_id);
    CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS payment_transactions_provider_ref_idx ON payment_transactions(provider_reference);
    CREATE TABLE IF NOT EXISTS payment_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
      event_type varchar(80) NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON payment_events(payment_id);
    CREATE INDEX IF NOT EXISTS payment_events_created_idx ON payment_events(created_at);
  `);
  console.log("Sprint 14.4 payment migration applied.");
} finally { await sql.end({ timeout: 5 }); }
