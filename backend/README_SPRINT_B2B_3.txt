ZhaoXi 19.0.0 Sprint B2B.3 — Disposable PostgreSQL Replay

Purpose
- Apply the generated 19.0.0 canonical baseline ONLY to the disposable database.
- Fail closed unless the target database is exactly zhaoxi_b2b_empty and starts with 0 public tables.
- Verify the live disposable schema against db/schema.ts after replay.

Safety
- Never run with .env.local.
- Run apply-disposable-baseline.mjs only with .env.disposable.local.
- Requires ZHAOXI_B2B_DISPOSABLE_APPLY=YES_DISPOSABLE_BASELINE.
- Expected baseline SHA-256: 4344ea767e1417ae05f0c47afcdeecba7568b320b5d8756323cb9d6d04164a9b
- Uses one transaction; failure rolls back the baseline replay.
