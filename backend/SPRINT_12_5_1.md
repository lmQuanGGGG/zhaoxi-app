# Sprint 12.5.1 — Direct Partner Routing

- Every customer request must include a valid enabled `serviceId`.
- The service must belong to an active organization.
- The request is created with `assigned_organization_id` and status `assigned`.
- Partner queues filter by the organization stored in the partner session.
- Generic unassigned requests are rejected instead of silently entering an admin queue.
