ZhaoXi 19.0.0 Sprint B2B.4-B2B.6 — Canonical Migration Finalization

Scope
- Canonicalizes five production invariants into db/schema.ts:
  1) support_satisfaction rating CHECK 1..5
  2) customer_support_threads assignment index
  3) customer_support_threads escalation index
  4) customer_support_threads priority index
  5) customer_browsing_history viewed_at DESC index
- Fixes Windows-safe offline drizzle-kit invocation.
- Fixes schema-qualified enum verification.
- Packages a stable canonical fresh baseline under migrations/canonical/19.0.0.
- Separates required bootstrap data from optional seed data.
- Retires 51 legacy db:apply migration scripts for fresh builds without deleting historical files.
- Adds guarded disposable reset/replay/bootstrap verification.
- Adds production-vs-disposable semantic convergence verification.
- Does NOT run or alter production automatically.

Safety
- Production baseline replay is forbidden by ledger-policy.json.
- Disposable mutation scripts refuse any database name except zhaoxi_b2b_empty.
- Canonical fresh numbering starts with 0000 schema, 0001 required bootstrap, future migrations start at 0002.
- Drizzle legacy __drizzle_migrations is not fabricated or backfilled in this sprint.
