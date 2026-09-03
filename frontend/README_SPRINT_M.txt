ZhaoXi 19.0.0 Sprint M - Authentication Replay CAS Compatibility

Platform baseline: 10c8da8

Scope:
- Keep Backend authoritative for refresh-token rotation and replay protection.
- Keep WeChat session exchange consumption Backend-owned.
- Keep ZhaoXi QR exchange consumption Backend-owned.
- Keep role-switch handoff consumption Backend-owned for Customer, Partner, Admin, and Driver.
- Platform stores or rotates authentication cookies only after successful Backend responses.
- Browser and BFF do not implement an independent authentication consume ledger.
- Preserve Sprint L transactional request CAS compatibility.
- Preserve Sprint K canonical migration governance compatibility.
- No Platform application behavior change.
- No schema change.
- No canonical migration 0002.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- verify:19.0.0:sprint-j PASS
- typecheck:all PASS
- build:all PASS
