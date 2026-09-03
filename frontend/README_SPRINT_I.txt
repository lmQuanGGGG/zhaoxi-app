ZhaoXi 19.0.0 Sprint I - Verified Customer Profile Integrity

Backend baseline: dfce965
Platform baseline: 5dd2c3e

Scope:
- Verified phone is read-only in Customer profile UI.
- Customer profile PATCH excludes the identity-owned verified phone.
- Guest profile guidance requires phone verification before persistent-account upgrade.
- Customer profile BFF contract remains unchanged.
- Sprint H.1 OTP/eSMS compatibility is preserved.
- No database migration or schema change.

Validation:
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
