# Sprint 14.1 - WeChat QR Login

This sprint is the first feature release on top of the locked Foundation 14.0 architecture.

## Platform
- WeChat QR is the primary login method for Customer, Partner and Admin.
- The existing account/password login remains as a controlled fallback while WeChat accounts are being linked.
- Login state is polled through each app's same-origin API proxy.
- On WeChat H5, the UI offers direct continuation to the WeChat authorization URL instead of requiring a second device to scan its own screen.
- Successful WeChat identity is saved through the shared `@zhaoxi/auth` session layer.

## Authorization
- Customer: valid active WeChat identity.
- Partner: WeChat identity must be linked to an active organization member.
- Admin: WeChat identity must have the `admin` user role (or temporary server-side allowlist during rollout).

## Backend requirement
Deploy backend 14.1, run the 14.1 migration, then configure WeChat Open Platform credentials in Vercel before live QR login testing.
