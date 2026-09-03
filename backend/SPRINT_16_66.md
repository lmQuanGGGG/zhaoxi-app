# Sprint 16.66 — Customer Home Personalization, Unified Home Feed & Smart Resume

Built cumulatively on Sprint 16.65 GREEN/READY.

## Unified Home Feed
Authenticated Customer Home now consumes a dedicated personalized home feed derived from the Customer's own ZhaoXi activity.

Home feed includes:
- Smart Resume,
- Favorites,
- Recently Viewed,
- Recently Viewed Partners,
- For You recommendations.

The existing general recommendation carousel remains available as a broader discovery layer.

## Smart Resume
Priority:
1. most recently viewed service,
2. first favorite,
3. first For You recommendation.

Smart Resume links directly back to the service's public destination.

## Recently Viewed Partners
Partner history is derived only from recently viewed services.
The same Partner is deduplicated and links to the public Partner storefront.

## Privacy
Home personalization inherits the Sprint 16.65 policy:
- first-party activity only,
- Customer-scoped,
- clearable browsing history,
- no sensitive profiling,
- no external tracking,
- no cross-account sharing,
- no paid placement,
- no internal Trust Score ranking boost.

## Product behavior
The Home screen links to `/discover` for deeper personalization.
Guests do not receive private personalized data.

## Financial invariants
Home personalization has no effect on:
- Platform Fee,
- payment routing,
- settlement,
- Partner funds.

## Migration
No database migration.
The feature reuses existing Favorites and Browsing History data.

Single-language remains mandatory.
