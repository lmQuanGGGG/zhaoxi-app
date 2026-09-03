CREATE TABLE payment_transactions (
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
CREATE INDEX payment_transactions_request_idx ON payment_transactions(request_id);
CREATE INDEX payment_transactions_status_idx ON payment_transactions(status);
CREATE INDEX payment_transactions_provider_ref_idx ON payment_transactions(provider_reference);

CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_payment_idx ON payment_events(payment_id);
CREATE INDEX payment_events_created_idx ON payment_events(created_at);

CREATE TABLE support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  role varchar(24) NOT NULL DEFAULT 'customer',
  locale varchar(10) NOT NULL DEFAULT 'vi-VN',
  subject varchar(240) NOT NULL DEFAULT 'ZhaoXi Support',
  status varchar(24) NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_conversations_user_idx ON support_conversations(user_id);
CREATE INDEX support_conversations_org_idx ON support_conversations(organization_id);
CREATE INDEX support_conversations_status_idx ON support_conversations(status);

CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_role varchar(24) NOT NULL,
  body text NOT NULL,
  intent varchar(60),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_conversation_idx ON support_messages(conversation_id);
CREATE INDEX support_messages_created_idx ON support_messages(created_at);

CREATE TABLE driver_location_history (
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
CREATE INDEX driver_location_history_driver_idx ON driver_location_history(driver_id);
CREATE INDEX driver_location_history_job_idx ON driver_location_history(job_id);
CREATE INDEX driver_location_history_recorded_idx ON driver_location_history(recorded_at);

CREATE TABLE delivery_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE SET NULL,
  event_type varchar(48) NOT NULL,
  from_status varchar(32),
  to_status varchar(32),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_job_events_job_idx ON delivery_job_events(job_id);
CREATE INDEX delivery_job_events_driver_idx ON delivery_job_events(driver_id);
CREATE INDEX delivery_job_events_created_idx ON delivery_job_events(created_at);
