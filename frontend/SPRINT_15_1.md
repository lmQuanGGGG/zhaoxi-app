# Sprint 15.1 — Beta Observability & Incident Center

Centralized runtime reporting for all four frontend apps plus an Admin incident center at `/incidents`.

Runtime error reporting is best-effort and never blocks the application. The backend strips metadata keys containing token, secret, password, authorization or cookie before persistence.

## Commands
`npm install` → `npm run verify:15.1` → `npm run typecheck:all` → `npm run build:all`.
