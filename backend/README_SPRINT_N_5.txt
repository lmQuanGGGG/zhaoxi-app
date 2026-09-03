ZhaoXi 19.0.0 Sprint N.5 - Payment Creation and Checkout CAS

Backend baseline: 944e2e1

Scope:
- Make ensureForRequest transactionally idempotent under concurrent callers.
- Use payment_transactions.idempotency_key as database single-winner identity.
- Append PAYMENT_CREATED and request payment projection only for the winning insert.
- Make WeChat Native checkout creation single-winner before external provider invocation.
- Reject concurrent callers while native_v3_creating is active.
- Use expected updatedAt/status CAS for checkout acquisition.
- Bind checkout completion/failure writes to the winning claim version.
- Preserve N.4 webhook replay safety and N.3 atomic payment transitions.
- No schema change.
- No canonical migration.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-n-5 PASS
- verify:19.0.0:sprint-n-4 PASS
- verify:19.0.0:sprint-n-3 PASS
- verify:19.0.0:sprint-n-2 PASS
- typecheck PASS
- build PASS
