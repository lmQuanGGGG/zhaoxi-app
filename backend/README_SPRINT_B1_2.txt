ZHAOXI 19.0.0 SPRINT B1.2 - SEMANTIC SCHEMA RECONCILIATION
===========================================================
Purpose:
- Fix false-positive schema drift in B1.1 without mutating the database.
- Compare indexes by semantic shape (unique + ordered columns), not generated PostgreSQL names.
- Normalize JSON/JSONB defaults before comparison.
- Execute metadata inspection inside an explicit READ ONLY transaction.

Safety:
- No migration execution.
- No DDL/DML.
- No changes to db/schema.ts, migrations/, APIs, auth, payments, WeChat, or Platform.
