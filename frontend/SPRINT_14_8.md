# Sprint 14.8 — Dynamic Marketplace Recommendation & Search 2.0

- Customer recommendations now come from active Partner services, not a hard-coded list.
- Frequently requested services and newly joined Partners receive ranking priority.
- The feed rotates every 10 seconds and is diversified across service modules.
- Modules without a Partner use a category-specific visual fallback and remain discoverable.
- Food recommendations link only to the new restaurant experience (`/restaurant/[organizationId]`).
- Search 2.0 searches services, Partners and service categories with one selected language only.
- Added shared `@zhaoxi/marketplace` types/helpers for future Customer/Partner/Admin reuse.
