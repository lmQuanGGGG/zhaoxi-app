ZhaoXi 19.0.0 Sprint N.3 - Atomic Core Payment Transition

Backend baseline: 5aa53cd

Scope:
- Make core payment status transitions transactional.
- Preserve expected-state CAS on payment_transactions.status.
- Append payment_events only inside the winning transaction.
- Update service_requests.details.paymentStatus inside the same transaction.
- Roll back event and request projection if any transactional write fails.
- Preserve PAYMENT_CONFLICT behavior for stale concurrent writers.
- Preserve Sprint N.2 provider event registry and canonical 0002.
- No schema change in N.3.
- No canonical 0003 in N.3.
- No production database mutation.

Next phase:
- N.4 adds WeChat Pay webhook timestamp freshness and provider event single-claim replay protection.

Validation:
- verify:19.0.0:sprint-n-3 PASS
- verify:19.0.0:sprint-n-2 PASS
- verify:19.0.0:sprint-n-1 PASS
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- typecheck PASS
- build PASS
