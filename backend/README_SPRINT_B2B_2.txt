ZhaoXi 19.0.0 Sprint B2B.2 - Canonical DDL Extraction

Purpose
- Generate a fresh-schema Drizzle baseline from db/schema.ts without connecting to any database.
- Verify the generated baseline covers all 90 declared tables and contains schema DDL only.
- Classify legacy INSERT/UPDATE data migrations before any bootstrap-data canonicalization.

Safety
- No production database connection.
- No db:migrate, db:push, db:apply:* or drizzle-kit migrate.
- Generated baseline goes only to artifacts/canonical-baseline/19.0.0.
- Existing migrations/0000..0005 are not modified.

Expected gates
1) node scripts/db/classify-legacy-data-mutations.mjs
2) node scripts/db/generate-canonical-baseline.mjs
3) node scripts/db/verify-canonical-baseline.mjs

B2B.3 will apply the generated baseline only to a disposable PostgreSQL database and run the full 90-table/917-column structural reconciliation.
