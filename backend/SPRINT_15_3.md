# Sprint 15.3 — Beta Access Control & Invite System

- Beta invite codes are stored as SHA-256 hashes; plaintext code is returned only when created.
- Invite roles: customer, partner, driver. Admin remains controlled by the existing admin role.
- Tester states: pending, active, suspended, revoked.
- Release-channel rule: stable customers are public; partner/driver remain eligible for controlled access.
- Admin endpoints require an authenticated admin session.
- Apply `npm run db:apply:15.3` before deployment.
