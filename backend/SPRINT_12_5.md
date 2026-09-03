# Sprint 12.5 — Direct Partner Routing Core

- A service request with a valid service is assigned immediately to `services.organization_id`.
- Initial status is `assigned`, not `new`.
- Active services without an active partner return HTTP 409 instead of creating an orphan transaction.
- Partner is the first operational actor. Admin remains an oversight role.
- Existing schema is reused; no migration is required.
