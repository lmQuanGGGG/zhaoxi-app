# Sprint 15.0 — Beta Release Hardening

First ZhaoXi beta hardening release on the locked Foundation 14 architecture.

- Runtime error boundaries for Customer, Partner, Admin and Driver.
- Consistent loading and 404 states across all four apps.
- `/api/platform-health` in every frontend app with a five-second backend timeout.
- Shared `@zhaoxi/release` beta release contract.
- No authentication, payment, delivery, marketplace or database architecture changes.

## Release gate
`npm install` → `npm run verify:15.0` → `npm run typecheck:all` → `npm run build:all`.

After deployment, confirm `/api/platform-health` returns `ok: true` from Customer, Partner, Admin and Driver.
