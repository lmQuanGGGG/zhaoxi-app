# Sprint 14.4 — Payment Core

Sprint 14.4 adds the shared payment domain without changing the locked Foundation/Auth architecture.

## Included
- Payment transactions and immutable payment event history.
- Idempotent payment initialization per order + method.
- Cash on delivery as the default production-safe method.
- Bank transfer configuration contract.
- WeChat Pay capability contract, intentionally not treated as live unless merchant credentials are configured.
- Payment status mirrored into `service_requests.details` so Customer, Partner, Admin and Driver can read one shared state.

## Payment states
`pending`, `awaiting_payment`, `cash_due`, `paid`, `cash_collected`, `failed`, `cancelled`, `refunded`.

## Next
Sprint 14.5 will connect the WeChat Pay provider flow (prepay + signed callback) after merchant credentials are available.
