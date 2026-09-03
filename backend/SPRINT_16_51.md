# Sprint 16.51 — Payment Provider Adapter & Transaction Reconciliation

Cumulative release on Sprint 16.50 GREEN/READY.

## Provider-neutral adapter contract
All future Partner-owned payment providers implement the same operations:
- `createPayment`
- `queryPayment`
- `closePayment`
- `refundPayment`
- `verifyWebhook`
- `reconcileTransaction`

The current adapter is passive/provider-neutral and does not pretend to move money.
Provider-specific SDKs can replace the adapter implementation without changing Travel booking UX.

## Durable transaction log
New table: `partner_payment_transactions`

Each payment event records:
- booking/request,
- Partner organization,
- intent ID,
- provider,
- merchant ID,
- provider reference,
- event type,
- normalized status,
- amount/currency,
- source,
- idempotency key,
- safe payload,
- timestamp.

Webhook duplicate protection uses a unique idempotency key.

## Reconciliation
Admin can compare ZhaoXi booking payment status against the latest normalized provider transaction event.
Mismatch examples:
- ZhaoXi `pending` but gateway event `paid`
- ZhaoXi `paid` but latest provider event `refunded`

Admin or the owning Partner can run reconciliation.
Reconciliation:
- repairs only ZhaoXi's recorded payment state,
- never moves Customer money,
- writes an operations audit entry,
- writes a reconciliation transaction event.

## Direct-to-Partner invariant
All transaction logs preserve:
- `directToPartner=true`
- `platformHoldsFunds=false`

ZhaoXi remains outside the Customer booking money flow.
Platform usage fee from Sprint 16.49 remains separate.

## Migration
Sprint 16.51 adds `partner_payment_transactions`.
Run `npm run db:apply:16.51` before deployment.

## Scope
No live provider-specific SDK is activated in this Sprint.
No raw merchant secret is stored in the database.
Single-language remains mandatory.
