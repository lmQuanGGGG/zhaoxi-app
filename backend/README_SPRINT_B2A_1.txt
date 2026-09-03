ZhaoXi 19.0.0 Sprint B2A.1 - Full Schema Fingerprint Fix

Scope:
- Fix scripts/db/schema-fingerprint.mjs to fingerprint artifacts/schema/production-schema-full.json.
- Strip volatile generatedAt/database/serverVersion metadata before hashing.
- Write artifacts/schema/production-schema-full.sha256.

No database mutation. No migration changes. No API/business logic changes.
