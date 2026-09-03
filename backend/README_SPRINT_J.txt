ZhaoXi 19.0.0 Sprint J - Verified Transaction Phone Integrity

Backend baseline: dfce965

Scope:
- Service requests require verified Customer identity.
- Housing inquiries require verified Customer identity.
- Travel inquiries require verified Customer identity.
- Transaction customerPhone is sourced from users.phone on the authenticated verified Customer.
- Browser-supplied customerPhone is not trusted for verified transactions.
- Sprint I verified-profile integrity remains intact.
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
- typecheck PASS
- build PASS
