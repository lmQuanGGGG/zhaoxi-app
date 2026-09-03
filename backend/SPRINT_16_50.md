# Sprint 16.50 — Partner-owned Payment Gateway Integration Foundation

Cumulative release on Sprint 16.49 GREEN/READY.

## Core Rule
Travel booking payment is direct-to-Partner.

Customer funds:
Customer -> Partner merchant / Partner-owned gateway.

ZhaoXi:
- does not receive Customer booking money,
- does not hold Customer funds,
- does not settle booking proceeds to Partner,
- only observes transaction status and maintains the separate platform usage fee ledger.

## Partner Gateway Configuration
Each Partner can configure:
- provider mode:
  - `partner_checkout_link`,
  - `partner_qr`,
  - `custom_api`,
- merchant ID,
- display name,
- HTTPS checkout URL,
- QR payload/template,
- currency,
- credential reference,
- webhook secret reference.

Raw API keys / webhook secrets are NOT stored in organization metadata.

Credential references must use:
`ZX_PARTNER_GATEWAY_*`

The actual secret value must be bound through deployment environment / secret storage.

## Gateway Readiness
Readiness detects:
- disabled gateway,
- missing merchant ID,
- missing HTTPS checkout URL,
- missing QR payload,
- missing custom API credential reference,
- credential secret not bound,
- webhook secret not bound.

## Customer Payment Intent
Only a Customer who owns a confirmed Travel booking can create a payment intent.

Payment intent snapshots:
- booking amount from `quotedAmount`,
- Partner organization,
- merchant ID,
- provider,
- currency,
- checkout URL / QR payload,
- `directToPartner=true`,
- `platformHoldsFunds=false`.

Checkout/QR templates may use:
- `{amount}`,
- `{requestCode}`,
- `{intentId}`.

## Signed Partner Webhook Foundation
Generic webhook endpoint:
`/api/partner-payment-webhook/[organizationId]`

Webhook is authenticated using HMAC-SHA256 with the Partner's environment-bound webhook secret.

Expected generic webhook body:
- `intentId`,
- `status`: pending / paid / failed / cancelled,
- `providerReference`.

The webhook updates only ZhaoXi booking payment status. It does not move money.

Paid callbacks are idempotent.

## Admin
Admin has read-only gateway readiness oversight.
Admin does not edit Partner merchant credentials or receive Customer funds.

Admin retains the separate per-Partner platform usage fee management from Sprint 16.49.

## Customer
Confirmed Travel bookings can:
- create a Partner payment intent,
- open Partner checkout in a new window,
- see/copy Partner QR payload,
- refresh payment status.

All Customer payment copy explicitly states that payment goes directly to Partner.

## Scope
This is a provider-neutral integration foundation.
No provider-specific SDK is wired yet.
No raw payment secret is stored in database.
No database migration is required.
Single-language remains mandatory.
