ZhaoXi 19.0.0 Sprint L - Transactional Request CAS

Backend baseline: 2c2cd57

Scope:
- Make generic service-request status transitions transactional.
- Make generic request assignment transactional.
- Use expected-state compare-and-set on service_requests.status.
- Append request status history in the same database transaction as the mutation.
- Return HTTP 409 REQUEST_STATE_CONFLICT for stale concurrent writers.
- Preserve Sprint A force-transition containment.
- Preserve Sprint K canonical migration governance.
- No schema change.
- No canonical migration 0002.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- verify:19.0.0:sprint-j PASS
- verify:19.0.0:sprint-i PASS
- verify:19.0.0:sprint-h-1 PASS
- verify:19.0.0:sprint-h PASS
- verify:19.0.0:sprint-g PASS
- verify:19.0.0:sprint-f PASS
- verify:19.0.0:sprint-e PASS
- verify:19.0.0:sprint-d PASS
- verify:19.0.0:sprint-c PASS
- verify:19.0.0:security PASS
- typecheck PASS
- build PASS
