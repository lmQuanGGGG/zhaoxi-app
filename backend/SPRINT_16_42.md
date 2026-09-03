# Sprint 16.42 — Housing Listing Management & Partner Inventory Control

Cumulative release on Sprint 16.41 GREEN/READY.

## Partner Housing Inventory
- Dedicated Housing Inventory workspace.
- Create and edit rental listings with:
  - localized name, summary and description,
  - monthly rent,
  - property type,
  - bedrooms, bathrooms and area,
  - district and detailed address,
  - furnishing,
  - deposit and minimum lease,
  - available-from date,
  - amenities,
  - latitude / longitude,
  - cover image and multi-photo gallery.
- Listing lifecycle:
  - Draft / unpublished,
  - Published,
  - Archived.
- Housing availability:
  - available,
  - reserved,
  - rented.
- Partner can publish/unpublish or change availability directly from inventory cards.

## Security
All dedicated Housing Inventory APIs require an authenticated Partner and active membership in the listing organization. Organization ownership is revalidated on every write.

## Customer Sync
Published listings reuse `services.is_enabled=true`. Customer Housing APIs already use no-store reads, so published inventory and status changes become visible without a separate catalog synchronization job. Unpublished/archived listings are not returned by Customer service detail/list APIs.

## Audit
Create, update and archive actions are written to `operations_audit_logs` under `housing_inventory`.

## Compatibility
No database migration is required. Housing inventory continues using existing `services`, `service_translations`, and `services.metadata`. Housing analytics now reads the canonical `housingAvailabilityStatus` field.
