ZhaoXi 19.0.0 Sprint N.4 - WeChat Pay Webhook Freshness and Replay Safety

Backend baseline: 6916f29

Scope:
- Enforce WeChat Pay webhook timestamp freshness within 300 seconds.
- Require provider notification ID.
- Claim each WeChat provider event exactly once using payment_provider_events.
- Preserve payload SHA-256 and signature timestamp/nonce metadata.
- Treat duplicate provider callbacks as idempotent successful acknowledgements.
- Execute provider-event claim, webhook payment event, payment transition, request payment projection, and processed marker in one database transaction.
- Reuse PaymentService atomic transition logic through a caller-owned transaction executor.
- Preserve standalone PaymentService transaction behavior.
- No schema change in N.4.
- No new canonical migration in N.4.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-n-4 PASS
- verify:19.0.0:sprint-n-3 PASS
- verify:19.0.0:sprint-n-2 PASS
- verify:19.0.0:sprint-n-1 PASS
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- typecheck PASS
- build PASS
