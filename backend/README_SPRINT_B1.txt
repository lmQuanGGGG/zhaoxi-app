ZHAOXI 19.0.0 SPRINT B1 - READ-ONLY SCHEMA RECONCILIATION

This patch adds only read-only tooling under scripts/db/.
It does NOT modify db/schema.ts, migrations, API routes, auth, payments, WeChat, or Platform.
It does NOT execute DDL/DML.

Recommended execution from Backend repo root:
  node --env-file=.env.local scripts/db/inspect-production-schema.mjs
  node scripts/db/extract-declared-table-inventory.mjs
  node scripts/db/compare-schema-contract.mjs
  node scripts/db/schema-fingerprint.mjs

Expected artifacts (do not commit yet):
  artifacts/schema/production-schema.json
  artifacts/schema/declared-table-inventory.json
  artifacts/schema/schema-table-diff.json
  artifacts/schema/production-schema.sha256

compare-schema-contract intentionally exits 10 when drift is detected. That is a diagnostic result, not a failed read-only snapshot.
