CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status varchar(24) NOT NULL DEFAULT 'offline',
  phone varchar(30),
  vehicle_type varchar(40) NOT NULL DEFAULT 'motorbike',
  plate_number varchar(40),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_profiles_status_idx ON driver_profiles(status);
CREATE INDEX IF NOT EXISTS driver_profiles_user_idx ON driver_profiles(user_id);

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE SET NULL,
  status varchar(32) NOT NULL DEFAULT 'searching_driver',
  pickup_address text, pickup_latitude numeric(10,7), pickup_longitude numeric(10,7),
  dropoff_address text, dropoff_latitude numeric(10,7), dropoff_longitude numeric(10,7),
  assigned_at timestamptz, picked_up_at timestamptz, delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_jobs_status_idx ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS delivery_jobs_driver_idx ON delivery_jobs(driver_id);
CREATE INDEX IF NOT EXISTS delivery_jobs_created_idx ON delivery_jobs(created_at);

CREATE TABLE IF NOT EXISTS driver_locations (
  driver_id uuid PRIMARY KEY REFERENCES driver_profiles(id) ON DELETE CASCADE,
  latitude numeric(10,7) NOT NULL, longitude numeric(10,7) NOT NULL,
  accuracy_meters numeric(10,2), heading numeric(8,2), speed_mps numeric(10,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);
