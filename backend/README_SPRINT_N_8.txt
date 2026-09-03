ZhaoXi 19.0.0 Sprint N.8 - WeChat Payment Identity Binding

Backend baseline: 978ef5e

Scope:
- Validate canonical WeChat payment identity during recovery and webhook processing.
- Validate appid, mchid, out_trade_no, attach/payment id, amount, and CNY currency.
- Require transaction_id for successful WeChat provider transactions.
- Detect conflicting provider transaction ids and fail closed.
- Bind recovery identity validation to the claimed payment version.
- Bind webhook identity validation to the current payment snapshot inside the transaction.
- Persist canonical providerTransactionId into payment checkout state.
- Preserve provider event transaction identity and duplicate webhook replay safety.
- Preserve Sprint N.7 recovery lease safety.
- Update Sprint N.4 verifier for compatibility with the currentPayment duplicate-webhook architecture.
- No schema change.
- No canonical migration.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-n-8 PASS
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
