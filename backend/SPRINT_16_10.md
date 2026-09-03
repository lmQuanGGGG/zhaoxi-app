# Sprint 16.10 — Authentication Preflight & WeChat Session Hardening

This is a cumulative patch on top of Sprint 16.9. No prior authentication, release-audit, operations-audit, command-center, payment, order, driver, account, or role-switch module is removed.

## Backend hardening
- Adds `/api/auth/preflight` for non-secret deployment readiness checks.
- Keeps WeChat QR login and legacy compatibility intact.
- Rejects disabled users during WeChat identity resolution.
- Makes repeated WeChat callbacks idempotent after confirmation and rejects inactive login sessions.
- Adds bounded timeouts to WeChat token/profile network calls.
- Adds composite indexes for active WeChat login-session and auth-session lookups.
- Preserves Sprint 16.8 + 16.9 audit structures.

## Test gate
Run migration, verifier, TypeScript check and production build before Git push or Vercel functional testing.
