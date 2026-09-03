# Sprint 16.29.1 — Backend TypeScript Hotfix

Cumulative hotfix on Sprint 16.29.

- Fixes TS2783 in `food-commercial-service.ts`.
- `evaluateFoodCommercial()` already returns `quantity`, so `orderPricing()` no longer declares `quantity` before spreading the pricing result.
- No business logic changes.
- No database migration.
- Platform 16.29 remains compatible.
