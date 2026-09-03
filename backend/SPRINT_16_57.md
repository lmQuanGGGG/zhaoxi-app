# Sprint 16.57 — Payment Support Analytics, SLA Performance & Partner Quality Score

Cumulative on Sprint 16.56 GREEN/READY.

## Analytics
Payment support analytics are derived from existing Travel booking/support data:
- ticket count,
- active / resolved tickets,
- SLA overdue tickets,
- escalations,
- payment exceptions,
- average first Partner response time,
- SLA met rate,
- refund ETA met rate,
- escalation rate,
- exception rate.

## Measurement
First Partner response:
- earliest Partner support timeline action or Partner support message after ticket creation.

SLA met:
- first Partner response occurs on or before `slaDueAt`.

Refund ETA met:
- refund completion occurs on or before the ETA captured in the latest `await_refund` timeline event.

Historical refund ETA remains measurable even though active `refundEtaAt` is cleared after a successful refund.

## Payment Support Quality Score
Score range: 0–100.

Weighted components:
- SLA performance: 30
- first response speed: 20
- refund ETA performance: 25
- low escalation rate: 15
- low exception rate: 10

Only metrics with actual samples participate in the weighted denominator.
A Partner is not penalized for a metric that has no data yet.

The score is operational-quality analytics only.
It does not change payment routing, Partner funds, pricing or platform usage fee.

## Admin
Admin receives:
- platform aggregate payment-support analytics,
- Partner ranking by quality score,
- SLA/refund performance,
- response time,
- escalation/exception rates,
- score component drill-down and sample sizes.

## Partner
Partner receives a self-service quality dashboard with:
- current score,
- tickets,
- active/overdue counts,
- first-response average,
- SLA met rate,
- refund ETA met rate,
- escalation rate,
- exception rate.

## Financial invariant
Customer payment and refund money remain direct between Partner merchant and Customer.
Admin analytics never move funds and never create settlement authority.

## Migration
No database migration.
All metrics are computed from existing service request details, support timelines, messages and payment exceptions.

Single-language remains mandatory.
