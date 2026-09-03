# Sprint 12.7 — Multi-Service Marketplace

No database migration is required. Existing organization and service metadata fields store logo URLs, banner URLs, product/service image URLs, and module-specific attributes.

The existing APIs remain responsible for persisting Partner catalog data:

- `PATCH /api/organizations/:id`
- `POST /api/services`
- `PATCH /api/services/:id`
