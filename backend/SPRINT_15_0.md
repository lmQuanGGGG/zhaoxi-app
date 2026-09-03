# Sprint 15.0 — Backend Beta Release Hardening

Adds dependency-aware health, readiness and version endpoints without changing the database schema.

- `/api/health`
- `/api/readiness`
- `/api/version`

Health responses expose capability booleans only and never credentials.
