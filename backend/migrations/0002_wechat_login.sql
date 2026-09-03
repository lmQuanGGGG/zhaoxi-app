CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(24) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);

CREATE TABLE IF NOT EXISTS wechat_login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state varchar(96) NOT NULL UNIQUE,
  role varchar(24) NOT NULL,
  locale varchar(10) NOT NULL DEFAULT 'zh-CN',
  status varchar(24) NOT NULL DEFAULT 'waiting_scan',
  return_url text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  wechat_open_id varchar(128),
  wechat_union_id varchar(128),
  error_code varchar(80),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wechat_login_sessions_status_idx ON wechat_login_sessions(status);
CREATE INDEX IF NOT EXISTS wechat_login_sessions_user_idx ON wechat_login_sessions(user_id);
CREATE INDEX IF NOT EXISTS wechat_login_sessions_expires_idx ON wechat_login_sessions(expires_at);
