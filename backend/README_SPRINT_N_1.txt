ZhaoXi 19.0.0 Sprint N.1 - Frozen Canonical Baseline Guard

Backend baseline: a66601e

Scope:
- Freeze canonical 0000_full_schema.sql as the immutable 90-table Release 19.0.0 baseline.
- Freeze 0001_required_bootstrap.sql.
- Prevent package-canonical-release.mjs from replacing the locked 0000 baseline.
- Reserve 0002 and later for forward canonical schema migrations.
- Preserve production no-baseline-replay policy.
- Preserve production attestation requirement before forward canonical migrations.
- No schema change in N.1.
- No 0002 created in N.1.
- No database connection or production mutation.

Next phase:
- N.2 introduces payment provider event registry in db/schema.ts and canonical 0002.
- N.3 makes payment status/event/request projection atomic.
- N.4 adds WeChat Pay webhook freshness and replay-safe provider event claiming.

Validation:
- verify:19.0.0:sprint-n-1 PASS
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- typecheck PASS
- build PASS
