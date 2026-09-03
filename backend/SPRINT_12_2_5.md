# Sprint 12.2.5 — Notifications and operational alerts

Adds a derived notification feed from service request status history without requiring a database migration.

- `GET /api/notifications?audience=customer&codes=...`
- `GET /api/notifications?audience=partner&organizationId=...`
- `GET /api/notifications?audience=admin`

Admin responses also include requests still in `new` or `reviewing` for more than 10 minutes.
