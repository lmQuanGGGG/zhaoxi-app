# Sprint 16.53 — Payment Provider Adapter Runtime, Health Check & Failover Guard

Cumulative release on Sprint 16.52 GREEN/READY.

## Runtime Health
Provider health is now tracked persistently per Partner organization + provider in organization metadata.

Runtime state:
- closed: healthy / execution allowed,
- open: circuit breaker blocks new payment creation,
- half_open: cooldown expired; one recovery attempt may proceed.

Tracked values:
- consecutive failures,
- total successes,
- total failures,
- last success,
- last failure,
- last error,
- circuit opened time,
- retry time.

## Circuit Breaker
Threshold:
- 3 consecutive runtime failures.

Open duration:
- 5 minutes.

When open:
- ZhaoXi does not create a new payment intent through that provider.
- Customer funds are never redirected to ZhaoXi.
- Existing payment records remain intact.

After cooldown:
- state becomes half-open.
- a successful payment operation closes the circuit.
- another failure reopens it.

## Runtime Guard
Before `createPayment`:
1. Provider Registry availability is checked.
2. Partner gateway onboarding/readiness is checked.
3. Runtime circuit state is checked.
4. Adapter operation is attempted.
5. Success/failure updates persistent runtime health.

Valid signed provider webhooks also count as provider runtime success.
Provider-rejected webhook verification counts as runtime failure.
Invalid external signatures do not poison provider health.

## Partner-owned Failover
Partner may configure one fallback gateway.

Rules:
- fallback must be owned/configured by the same Partner,
- fallback cannot be the exact same provider + merchant as primary,
- fallback has its own merchant ID, checkout/QR config and secret references,
- fallback must independently pass Provider Registry onboarding,
- fallback has its own runtime circuit state.

Payment creation:
Primary healthy -> use Primary.
Primary blocked/fails -> try Partner Fallback.
Both unavailable -> reject payment intent creation.

There is NEVER fallback to:
- ZhaoXi merchant,
- Admin account,
- another Partner,
- a platform-owned payment account.

## Payment Intent
Payment intent records:
- actual provider used,
- actual merchant used,
- `fallbackUsed`,
- `primaryProvider`,
- `directToPartner=true`,
- `platformHoldsFunds=false`.

Webhook verification resolves the exact primary/fallback method used by the stored intent.

## Admin Runtime Oversight
Admin can view:
- primary/fallback role,
- circuit state,
- consecutive failures,
- success count,
- last error,
- retry time.

Admin oversight does not modify Partner merchant credentials.

## Partner UX
Partner can:
- configure fallback method,
- see fallback runtime health,
- keep the primary Provider Registry onboarding flow.

## Storage
No database migration is required.
Runtime health persists under:
`organizations.metadata.paymentProviderRuntime`

Fallback configuration persists under:
`organizations.metadata.partnerPaymentGateway.fallbackGateway`

## Product Rules
Customer money remains direct-to-Partner.
ZhaoXi never holds Customer booking funds.
Platform Usage Fee remains separate.
Single-language remains mandatory.
