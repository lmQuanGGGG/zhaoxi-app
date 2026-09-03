ALTER TABLE wechat_login_sessions ADD COLUMN IF NOT EXISTS exchange_code_hash varchar(64);
ALTER TABLE wechat_login_sessions ADD COLUMN IF NOT EXISTS exchange_expires_at timestamptz;
ALTER TABLE wechat_login_sessions ADD COLUMN IF NOT EXISTS exchanged_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(24) NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  access_token_hash varchar(64) NOT NULL UNIQUE,
  refresh_token_hash varchar(64) NOT NULL UNIQUE,
  device_id varchar(128),
  device_name varchar(180),
  status varchar(24) NOT NULL DEFAULT 'active',
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_status_idx ON auth_sessions(status);
CREATE INDEX IF NOT EXISTS auth_sessions_refresh_exp_idx ON auth_sessions(refresh_expires_at);
CREATE INDEX IF NOT EXISTS auth_sessions_device_idx ON auth_sessions(device_id);
