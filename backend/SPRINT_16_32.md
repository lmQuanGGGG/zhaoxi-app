# Sprint 16.32 — Admin Restaurant Control & Platform Oversight

Cumulative release on Backend/Platform 16.31.

## Platform restaurant oversight
Admin receives a dedicated Restaurant control surface covering all organizations that publish Food services.

Admin can see:
- restaurant identity and platform status,
- platform pause status,
- Partner self-pause and business-hours controls,
- menu item count / enabled items / sold-out items,
- active Partner member count,
- coupon count and usage,
- Food order counts,
- completed/cancelled/in-progress orders,
- GMV, net food revenue, menu promotion discount, coupon discount and delivery subsidy.

## Drill-down
Admin can open one restaurant and inspect:
- 7 / 30 / 90 day Restaurant Analytics,
- top-selling items,
- coupon/campaign performance,
- kitchen capacity,
- Partner member counts,
- menu state and campaign state.

## Platform controls
Admin actions:
- `pause`: temporarily stop new Food orders while keeping Partner access and existing orders intact.
- `resume`: remove the Platform pause.
- `suspend`: suspend the restaurant organization so it cannot receive new service orders.
- `activate`: reactivate a suspended/pending restaurant.

Platform pause is checked by `restaurantAvailabilityService` before a new Food order is created and is surfaced to Customer as `platform_paused`.

## Audit
Every Admin activate/suspend/pause/resume action writes an `operations_audit_logs` record with:
- Admin actor user,
- restaurant organization,
- before state,
- after state,
- reason.

## Security
- All Admin Restaurant APIs require role `admin`.
- Partner analytics aggregation can be reused internally by Admin, but the public Partner analytics route still requires Partner authorization.
- Admin controls do not expose a Partner ability to override Platform pause.

## Compatibility
- No database migration is required.
- Coupon/redemption 16.30 remains authoritative.
- Restaurant Analytics 16.31 remains intact.
- Existing Kitchen Queue, Restaurant Operations, External Delivery and Customer single-language rules remain intact.
