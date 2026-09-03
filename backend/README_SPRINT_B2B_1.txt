ZhaoXi 19.0.0 Sprint B2B.1 - Migration Archaeology & Canonical Coverage

Scope:
- READ-ONLY repository analysis only.
- No database connection.
- No migration apply/push/migrate.
- Maps canonical SQL migrations + 51 legacy migrate scripts against db/schema.ts.

Run:
  node scripts\db\analyze-migration-archaeology.mjs
  node scripts\db\verify-canonical-coverage.mjs

Expected source-truth findings for current repo:
- Declared tables: 90
- Canonical tables from migrations/0000..0005: 24
- Legacy-created tables: 72
- Union canonical + legacy: 90
- Overlap: 6 (the B2A gap-closure tables)
- Canonical-only missing coverage before B2B convergence: 66 tables

Artifacts:
- artifacts/schema/migration-archaeology.json
- artifacts/schema/canonical-coverage.json

Do not commit artifacts/.
