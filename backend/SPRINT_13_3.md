# Sprint 13.3 — Public Media & Restaurant Experience

- Upload logo, banner and product images to the `zhaoxi-public-media` Blob store.
- Prefer `PUBLIC_MEDIA_READ_WRITE_TOKEN`; keep `BLOB_READ_WRITE_TOKEN` only as a compatibility fallback.
- Do not fail the user upload when media metadata registration is temporarily unavailable.
- Customer restaurant list shows two featured products per organization.
- A dedicated `/restaurant/[organizationId]` page shows the complete menu.
- Public banner slideshow and store logo are rendered directly from published URLs.
- No database migration is required.
