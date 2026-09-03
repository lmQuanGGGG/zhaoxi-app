ZHAOXI 19.0.0 SPRINT B1.1 - FULL CONTRACT RECONCILIATION
=========================================================
Purpose: read-only comparison of db/schema.ts against production PostgreSQL metadata.
NO migration, schema mutation, seed, API, auth, payment, WeChat, Platform, or UI changes.

Files:
- scripts/db/inspect-production-schema-full.mjs
- scripts/db/extract-declared-schema-contract.mjs
- scripts/db/compare-full-schema-contract.mjs
- scripts/db/verify-readonly-sql.mjs

Run order:
1) node scripts/db/verify-readonly-sql.mjs
2) node --env-file=.env.local scripts/db/inspect-production-schema-full.mjs
3) node scripts/db/extract-declared-schema-contract.mjs
4) node scripts/db/compare-full-schema-contract.mjs
5) echo COMPARE_FULL_EXIT_CODE=%errorlevel%

Expected: comparator exit 10 while the six known missing tables remain. The key question is whether STRUCTURAL_ISSUES=0 for the 84 matching tables.
Do not run db:migrate, db:apply:*, drizzle-kit push, seed, or any legacy migrate script.
