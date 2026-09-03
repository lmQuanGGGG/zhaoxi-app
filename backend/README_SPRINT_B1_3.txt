ZHAOXI 19.0.0 SPRINT B1.3 - JSON DEFAULT SEMANTIC NORMALIZATION
================================================================

Purpose
-------
Fix the B1.2 comparator false-positive for PostgreSQL JSON/JSONB defaults.
The previous comparator called a generic cleaner that removed double quotes
before JSON.parse(), turning valid JSON defaults into non-JSON strings.

Scope
-----
- Replaces only scripts/db/compare-full-schema-contract.mjs
- No database writes
- No schema.ts changes
- No migrations
- No API/runtime changes

Expected reconciliation after the existing B1.2 snapshots are regenerated:
- MATCHED_TABLES=84
- MISSING_TABLES=6
- EXTRA_TABLES=0
- STRUCTURAL_ISSUES=0
- INFORMATIONAL_DIFFERENCES=7
- exit code remains 10 because six declared tables are still absent.
