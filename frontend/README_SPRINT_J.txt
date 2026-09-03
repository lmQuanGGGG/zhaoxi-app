ZhaoXi 19.0.0 Sprint J - Verified Transaction Phone Integrity Platform

Backend baseline: 5171db8
Platform baseline: 1415f4a

Scope:
- Service order phone is read-only and sourced from verified Customer identity.
- Saved delivery-address phone cannot replace verified identity phone.
- Browser localStorage no longer persists verified transaction phone.
- Service request UI does not send customerPhone.
- Housing inquiry UI loads verified phone and excludes it from request payload.
- Travel inquiry UI loads verified phone and excludes it from request payload.
- Customer BFF strips browser-supplied customerPhone for service, housing, and travel transactions.
- Backend remains authoritative for users.phone.
- Sprint I verified profile integrity remains intact.
- No database migration or schema change.

Validation:
- verify:19.0.0:sprint-j PASS
- verify:19.0.0:sprint-i PASS
- verify:19.0.0:sprint-h-1 PASS
- verify:19.0.0:sprint-h PASS
- verify:19.0.0:sprint-g PASS
- verify:19.0.0:sprint-f PASS
- verify:19.0.0:sprint-e PASS
- verify:19.0.0:sprint-d PASS
- verify:19.0.0:sprint-c PASS
- typecheck:all PASS
- build:all PASS
