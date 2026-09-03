# Sprint 16.52 — Payment Provider Registry, Capability Matrix & Partner Gateway Onboarding

Cumulative release on Sprint 16.51 GREEN/READY.

## Provider Registry
ZhaoXi now has a controlled provider registry instead of free-form provider strings.

Registered providers:
- Partner Checkout Link
- Partner QR
- Custom Partner API

Each provider declares:
- enabled / beta,
- category,
- capabilities,
- required onboarding fields,
- implementation notes.

## Capability Matrix
Capabilities are normalized to:
- QR
- Redirect
- Query
- Close
- Refund
- Webhook
- Reconciliation

Future provider-specific adapters can be added to this matrix without changing Travel booking flow.

## Partner Onboarding
Partner gateway settings now:
- select only registered/enabled providers,
- render capabilities,
- render required/optional onboarding checks,
- disable irrelevant QR/redirect fields,
- validate Merchant ID / HTTPS URL / QR payload / Credential Ref / Webhook Secret Ref according to provider requirements.

Credential and webhook references still use `ZX_PARTNER_GATEWAY_*`.
Raw secrets remain outside the database.

## Backend Readiness
Partner gateway readiness now derives from Provider Registry onboarding requirements plus environment-secret binding checks.

A Partner cannot enable an incomplete gateway.

## Admin
Admin receives:
- Provider Registry health view,
- provider availability,
- beta state,
- capability matrix.

Admin remains read-only for Partner merchant configuration.

## Direct-to-Partner invariant
Customer money remains:
Customer -> Partner merchant.

ZhaoXi:
- does not hold Customer funds,
- does not settle Partner booking proceeds,
- only consumes transaction status and charges the separate platform usage fee.

## Migration
No database migration is required in Sprint 16.52.

## Product Rule
Single-language remains mandatory.
