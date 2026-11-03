-- Order chat photos (1–5 per message). Bytes are stored in the row and served
-- only through the authorized /api/order-chat-attachments/[id] route.
-- Additive only; safe to re-run.
CREATE TABLE IF NOT EXISTS "order_message_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "order_conversations"("id") ON DELETE cascade,
  "message_id" uuid REFERENCES "order_messages"("id") ON DELETE cascade,
  "uploader_role" varchar(16) NOT NULL,
  "uploader_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "mime_type" varchar(32) NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "data" bytea NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "order_message_attachments_message_idx"
  ON "order_message_attachments" ("message_id");
CREATE INDEX IF NOT EXISTS "order_message_attachments_pending_idx"
  ON "order_message_attachments" ("conversation_id", "uploader_user_id", "created_at");
