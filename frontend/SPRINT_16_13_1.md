# Sprint 16.13.1 — Unified Mobile Entry QR

One permanent ZhaoXi QR opens `/entry` on the stable Customer production domain.
The user then selects Customer or Partner on the same phone.

- Customer -> Customer app -> automatic Guest Bootstrap.
- Partner -> Partner app -> automatic Guest Bootstrap.
- QR itself is stable and reusable; it is not a login-session QR and does not expire.
- WeChat / WhatsApp / Camera are only scanners for the permanent link.
- Admin remains outside this public entry flow.
