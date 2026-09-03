# Sprint 16.35 — ZhaoXi Commercial Fee Policy & Partner Commission Engine

Cumulative release on 16.34.

- Adds global and restaurant-specific commission policies.
- Supports percentage, fixed-per-order and hybrid charging modes.
- Default remains disabled with 0% and 0 VND/order.
- Organization policy overrides the global policy when active.
- Optional effective date range prepares scheduled commercial agreements.
- Settlement preview resolves the policy at the settlement period end.
- Settlement creation snapshots the resolved commission policy and calculated fee.
- Existing settlements are never retroactively recalculated when a policy changes.
- Partner payable remains: foodRevenue - deliverySubsidy - platformCommission + adjustments.
- Admin-only policy writes are audit logged under restaurant_commission_policy.
