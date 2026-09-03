# Sprint 16.30.1 — Backend TypeScript Hotfix

Cumulative hotfix on Sprint 16.30.

Fixes:
- `success(data, 201)` now passes a valid `ResponseInit`: `success(data, {status:201})`.
- Coupon evaluation narrows the database `discountType` string to the `DiscountType` union (`percent | fixed`) before returning `CouponEvaluation`.

No coupon logic changes.
No database migration is required beyond the already-applied Sprint 16.30 migration.
Platform 16.30 remains compatible.
