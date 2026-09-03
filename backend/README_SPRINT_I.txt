ZhaoXi 19.0.0 Sprint I - Verified Customer Profile Integrity

Baseline: 8596ee7

Scope:
- Verified phone is owned by the identity verification flow.
- PATCH /api/customer-profile cannot mutate users.phone.
- Saving profile data cannot promote a Guest Customer.
- SMS OTP verification remains the phone identity-upgrade path.
- Existing verified Customer accounts resume by verified phone.
- No database migration or schema change.
- Sprint H.1 eSMS compatibility is preserved.

Validation:
- verify:19.0.0:sprint-i PASS
- verify:19.0.0:sprint-h-1 PASS
- verify:19.0.0:sprint-h PASS
- verify:19.0.0:sprint-g PASS
- verify:19.0.0:sprint-f PASS
- verify:19.0.0:sprint-e PASS
- verify:19.0.0:sprint-d PASS
- verify:19.0.0:sprint-c PASS
- typecheck PASS
- build PASS
