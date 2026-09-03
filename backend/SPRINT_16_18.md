# Sprint 16.18 — Customer Profile, Saved Identity & Personal Center

Cumulative release on Sprint 16.17.1.

- Customer profile data is persisted server-side under the authenticated ZhaoXi identity.
- The profile exposes a stable ZhaoXi ID derived from the internal user UUID without exposing secrets.
- Saving meaningful profile data promotes a Guest identity to persistent using the trusted-device contract.
- Customers can store multiple delivery/service addresses and choose a default address.
- Default saved contact/address information is reusable by checkout.
- Existing QR, session, order, payment, and Assistant flows are preserved.
- Single-language UI remains mandatory.
