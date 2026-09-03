ZhaoXi 19.0.0 Sprint K - Canonical Migration Governance

Backend baseline: 5171db8

Scope:
- Lock the Release 19.0.0 canonical-baseline-convergence architecture.
- Fresh databases use 0000_full_schema.sql followed by 0001_required_bootstrap.sql.
- Canonical baseline contains all 90 declared tables and is schema-only.
- Canonical packaged baseline must remain byte-identical to the verified generated baseline.
- Production must never replay the fresh canonical baseline.
- Production attestation is required before any future canonical migration.
- 51 historical migration scripts remain retired for fresh builds and preserved only for audit.
- Future canonical schema migration numbering starts at 0002.
- Sprint K introduces no schema migration and does not create 0002.
- No production database mutation is performed.

Validation:
- verify:19.0.0:sprint-k PASS
- canonical migration governance PASS
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
