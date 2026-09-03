# Sprint 15.1.1 — Backend Hotfix

- Loads `.env.local` before running the 15.1 observability migration.
- Supports pooled and non-pooled Vercel/Postgres connection variable names.
- Fixes observability POST response status to use `ResponseInit` (`{ status: 201 }`).
- No schema change beyond the original 15.1 migration.
