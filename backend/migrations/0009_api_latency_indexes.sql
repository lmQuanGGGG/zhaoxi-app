-- API latency indexes. Each one backs a hot, polled read path:
--   customer order list and personalized recommendations
--     (customer_id = ? order by created_at desc limit N)
CREATE INDEX IF NOT EXISTS "service_requests_customer_created_idx"
  ON "service_requests" ("customer_id", "created_at");
--   partner queue and partner notifications without a status filter
--     (assigned_organization_id = ? order by created_at desc limit N)
CREATE INDEX IF NOT EXISTS "service_requests_assigned_org_created_idx"
  ON "service_requests" ("assigned_organization_id", "created_at");
--   per-service usage counts for home recommendations (group by service_id)
CREATE INDEX IF NOT EXISTS "service_requests_service_idx"
  ON "service_requests" ("service_id");
--   admin notification feed (order by created_at desc limit 100)
CREATE INDEX IF NOT EXISTS "request_status_history_created_idx"
  ON "service_request_status_history" ("created_at");
--   partner organization lookup by member (session auth, membership checks)
CREATE INDEX IF NOT EXISTS "organization_members_user_idx"
  ON "organization_members" ("user_id");
