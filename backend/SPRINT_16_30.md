# Sprint 16.30 — Restaurant Coupons, Campaigns & Redemption Control

Cumulative release on Backend 16.29.1 and Platform 16.29.

## Coupon model
- Coupons belong to one restaurant organization.
- Supported discounts:
  - percentage discount with optional maximum discount cap,
  - fixed amount discount.
- Conditions:
  - minimum item subtotal,
  - start/end timestamps,
  - total redemption limit,
  - per-Customer redemption limit,
  - enabled/disabled state.
- Coupon codes are normalized to uppercase and unique per restaurant.

## Pricing order
1. Menu item base prices.
2. Per-item promotions from Sprint 16.29.
3. Restaurant coupon discount on the post-promotion item subtotal.
4. Gross delivery fee.
5. Restaurant delivery subsidy.
6. Final Customer total.

Formula:
`totalAmount = itemSubtotalAfterCoupon + deliveryGrossFee - deliverySubsidy`.

## Redemption control
- Customer preview never reserves a coupon.
- Final order creation recomputes menu prices and re-evaluates the coupon on Backend.
- Coupon redemption runs inside a DB transaction.
- PostgreSQL advisory lock serializes redemptions for the same coupon.
- Total usage and per-Customer usage are rechecked while the lock is held.
- A unique request redemption prevents the same Order from redeeming twice.
- If the coupon becomes unavailable between preview and confirmation, the temporary Order is removed before status history/payment initialization.

## Partner
- Food Store Manager includes Coupon & Campaign management.
- Partner membership is checked on every coupon mutation.
- Used coupons are archived (disabled) instead of physically deleted.

## Customer
- Checkout shows available coupons, manual code entry, eligibility and coupon discount.
- Order Detail preserves coupon code and discount accounting.
- Single-language remains mandatory.

This Sprint requires a database migration.
