ZhaoXi 19.0.0 Sprint N.7 - WeChat Checkout Recovery Lease Safety

Backend baseline: f1ed36a

Scope:
- Add expiring single-winner leases for WeChat Native checkout and recovery operations.
- Use a 2-minute lease timeout for stale checkout/recovery ownership.
- Use a 15-second recovery backoff to prevent rapid provider polling.
- Recover stale native_v3_creating and native_v3_recovering states instead of leaving payments permanently blocked.
- Claim recovery ownership with expected-version CAS before querying WeChat Pay.
- Bind recovery query failure, order-not-found, provider-pending, and SUCCESS exits to the winning recovery lease.
- Preserve recovery ownership using a unique recoveryToken and recoveryStartedAt.
- Reject concurrent active recovery with WECHAT_PAY_RECOVERY_IN_PROGRESS.
- Reject rapid repeated recovery with WECHAT_PAY_RECOVERY_BACKOFF.
- Accept webhook-paid races safely without overwriting completed payment state.
- Transition recovered SUCCESS payment and request projection atomically through PaymentService.
- Preserve Sprint N.6 signed out_trade_no recovery, Sprint N.5 payment/create CAS, and Sprint N.4 webhook replay safety.
- Update Sprint N.6 verifier for compatibility with the N.7 lease architecture.
- No schema change.
- No canonical migration.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-n-7 PASS
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
