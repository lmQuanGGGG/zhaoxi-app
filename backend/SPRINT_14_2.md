# Sprint 14.2 — Unified Authentication & Session Lock

Authentication architecture is now locked for ZhaoXi. WeChat QR remains the primary identity gateway. The backend issues opaque access/refresh sessions, rotates refresh tokens, tracks devices, supports logout and logout-all, and uses one-time QR exchange codes so the browser never treats a QR polling response as the long-lived credential.

## Security model
- Access token: 15 minutes.
- Refresh lifetime: Customer 30 days, Partner 14 days, Admin 1 day.
- Only SHA-256 token hashes are stored in PostgreSQL.
- WeChat QR exchange codes are one-time and expire after 90 seconds.
- Session role and organization context are server-issued.
- Device sessions can be listed and globally revoked.

Run `npm run db:apply:14.2` before deploying the 14.2 backend.
