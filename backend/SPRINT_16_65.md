# Sprint 16.65 — Personalized Discovery, Customer Favorites & Recently Viewed Hub

Built cumulatively on Sprint 16.64 GREEN/READY.

## Customer personalization hub
Authenticated Customer receives `/discover` with:
- Favorites,
- Recently Viewed,
- Continue Viewing,
- Recommended For You.

The hub reuses existing `customer_favorites` and `customer_browsing_history` tables.

## Favorites
Customer can:
- check favorite state,
- favorite a service,
- remove a favorite.

Favorite controls are reusable and mounted on Housing/Travel detail flows.

## Recently Viewed
First-party service views are recorded when:
- Customer opens Housing/Travel detail,
- Customer selects a service from Unified Search,
- Customer selects a service from a Partner Storefront.

The hub deduplicates repeated views for display while preserving recent activity order.

Customer can clear browsing history.

## Personalized recommendations
Simple preference weighting:
- favorite service module = weight 4,
- recently viewed service module = weight 1.

For You excludes current Favorites and Recently Viewed items.
No sensitive categories, external tracking, cross-account sharing, ad network identifiers or hidden Partner risk/compliance data are used.

The algorithm is intentionally transparent and lightweight.
No paid placement and no internal Trust Score boost.

## Privacy
Personalization is:
- first-party activity only,
- authenticated Customer scoped,
- clearable by Customer,
- no external tracking,
- no sensitive profiling,
- no cross-account sharing.

## Financial / commercial invariants
Personalization does not:
- alter Platform Fee,
- alter payment routing,
- create settlement authority,
- control Partner funds.

## Migration
No database migration is required because Favorites and Browsing History tables already exist.

Single-language remains mandatory.
