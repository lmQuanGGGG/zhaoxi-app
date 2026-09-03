CREATE TABLE "payment_provider_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(40) NOT NULL,
  "provider_event_id" varchar(180) NOT NULL,
  "payment_id" uuid,
  "provider_transaction_id" varchar(180),
  "event_type" varchar(80) NOT NULL,
  "payload_hash" varchar(64) NOT NULL,
  "signature_timestamp" varchar(32),
  "signature_nonce" varchar(180),
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT "payment_provider_events_payment_id_payment_transactions_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment_transactions"("id") ON DELETE set null ON UPDATE no action
);
CREATE UNIQUE INDEX "payment_provider_events_provider_event_unique" ON "payment_provider_events" USING btree ("provider","provider_event_id");
CREATE INDEX "payment_provider_events_payment_idx" ON "payment_provider_events" USING btree ("payment_id");
CREATE INDEX "payment_provider_events_transaction_idx" ON "payment_provider_events" USING btree ("provider_transaction_id");
CREATE INDEX "payment_provider_events_received_idx" ON "payment_provider_events" USING btree ("received_at");
