ZhaoXi 19.0.0 Sprint M - Authentication Replay CAS Regression Lock

Backend baseline: abe3cab

Scope:
- Lock atomic single-winner refresh-token rotation behavior.
- Lock single-use WeChat exchange claim behavior.
- Lock single-use ZhaoXi QR exchange claim behavior.
- Lock single-use role-switch handoff claim behavior.
- Concurrent stale/replayed credentials fail closed after one winning claim.
- Preserve Sprint L transactional request CAS.
- Preserve Sprint K canonical migration governance.
- No schema change.
- No canonical migration 0002.
- No production database mutation.

Important boundary:
- Expiry is validated before claim; Sprint M verifies replay/single-use CAS behavior and does not claim transactional expiry-boundary enforcement.

Validation:
- verify:19.0.0:sprint-m PASS
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
