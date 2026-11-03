-- Order chat: one conversation per service_request between the customer and the
-- assigned organization. Additive only; safe to re-run.
CREATE TABLE IF NOT EXISTS "order_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_request_id" uuid NOT NULL UNIQUE REFERENCES "service_requests"("id") ON DELETE cascade,
  "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "last_message_at" timestamp with time zone,
  "last_message_preview" text,
  "last_sender_role" varchar(16),
  "customer_last_read_at" timestamp with time zone,
  "partner_last_read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "order_conversations_customer_idx"
  ON "order_conversations" ("customer_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "order_conversations_org_idx"
  ON "order_conversations" ("organization_id", "last_message_at");

CREATE TABLE IF NOT EXISTS "order_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "order_conversations"("id") ON DELETE cascade,
  "sender_role" varchar(16) NOT NULL CONSTRAINT "order_messages_sender_role_check" CHECK ("sender_role" IN ('customer', 'partner')),
  "sender_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "body" text NOT NULL,
  "client_message_id" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "order_messages_conversation_idx"
  ON "order_messages" ("conversation_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "order_messages_client_id_unique"
  ON "order_messages" ("conversation_id", "client_message_id") WHERE "client_message_id" IS NOT NULL;
