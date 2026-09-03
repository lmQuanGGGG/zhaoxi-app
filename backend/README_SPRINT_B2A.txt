ZhaoXi 19.0.0 Sprint B2A - Production Gap Closure

Purpose:
- Canonicalize the six schema tables that are declared in db/schema.ts but absent from the verified production database.
- Do not use drizzle-kit migrate because production has no Drizzle migration ledger.
- Apply through scripts/db/apply-0005-gap-closure.mjs only after preflight and explicit confirmation.

Safety:
- 0005 is additive only: CREATE TABLE + CREATE INDEX.
- The applicator requires exactly 84 public tables, all six targets absent, required dependency tables present, no __drizzle_migrations ledger, and gen_random_uuid().
- Application is atomic inside one PostgreSQL transaction under an advisory transaction lock.
- No IF NOT EXISTS is used; partial/duplicate state fails closed.
- B2A does not create or seed a Drizzle migration ledger. Canonical ledger/bootstrap is deferred to B2B.

Targets:
payment_transactions
payment_events
support_conversations
support_messages
driver_location_history
delivery_job_events
