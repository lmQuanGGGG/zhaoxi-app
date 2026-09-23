CREATE INDEX IF NOT EXISTS "service_requests_assigned_org_status_created_idx"
  ON "service_requests" ("assigned_organization_id", "status", "created_at");
