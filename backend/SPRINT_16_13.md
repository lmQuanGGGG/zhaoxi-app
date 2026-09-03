# Sprint 16.13 — Mobile QR Entry & Guest Bootstrap

Cumulative release built on Sprint 16.12.2 GREEN/READY.

## Product flow
- The public ZhaoXi QR is a stable link to the Customer or Partner web app.
- Scanning opens ZhaoXi on the same phone; there is no second-device confirmation.
- Customer/Partner without a valid session are bootstrapped directly into a temporary Guest session.
- A ZhaoXi trusted-device credential is reused on the same browser/device.
- When meaningful profile data is saved, the existing 16.12.2 profile persistence contract promotes Guest to a persistent ZhaoXi identity.
- Admin remains separate and requires the issuer-controlled access card.
- Legacy QR pairing endpoints remain available for future security workflows, but are no longer the Customer/Partner entry UX.
