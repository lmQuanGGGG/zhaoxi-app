ZhaoXi 19.0.0 Sprint N.6 - WeChat Native Checkout Recovery

Backend baseline: 74dc9b7

Scope:
- Reconcile ambiguous WeChat Native checkout creation before any retry.
- Query WeChat Pay v3 by stable out_trade_no using authenticated provider requests.
- Treat ORDER_NOT_EXIST as a confirmed safe release back to native_v3_ready.
- Preserve existing provider orders as native_v3_recovery_pending for repeat recovery.
- Atomically transition recovered SUCCESS payments through PaymentService.
- Record dedicated recovery audit events for query failure, order-not-found, provider state, and recovered payment.
- Treat transport failures and provider HTTP 5xx create responses as uncertain rather than definite failure.
- Add authenticated payment-scoped recovery endpoint.
- Preserve Sprint N.5 single-winner checkout CAS and Sprint N.4 webhook replay safety.
- No schema change.
- No canonical migration.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-n-6 PASS
- verify:19.0.0:sprint-n-5 PASS
- verify:19.0.0:sprint-n-4 PASS
- verify:19.0.0:sprint-n-3 PASS
- verify:19.0.0:sprint-n-2 PASS
- verify:19.0.0:sprint-n-1 PASS
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- typecheck PASS
- build PASS
