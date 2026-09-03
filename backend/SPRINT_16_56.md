# Sprint 16.56 — Payment Notification, Refund ETA & Support Messaging Automation

Cumulative on Sprint 16.55 GREEN/READY.

## Payment / support notifications
Notification Center now recognizes payment/support events:
- payment paid,
- refund completed,
- payment support stage changes,
- Customer/Partner support messages,
- SLA due soon,
- SLA overdue,
- refund ETA due soon,
- refund ETA overdue.

The existing notification endpoint evaluates automation on read and preserves event-level deduplication.

## Refund ETA
When Partner moves a support ticket to `awaiting_refund`, Partner supplies a refund ETA in hours.
Default: 72 hours.
Allowed range: 1–720 hours.

Ticket stores:
- refundEtaHours
- refundEtaAt

Customer sees the refund ETA in Travel booking tracking.
Partner sees and can update it through the support workflow.

A successful refund operation or a verified `refunded` webhook:
- sets payment status to refunded,
- resolves the active payment-support ticket,
- writes `refundCompletedAt`,
- clears `refundEtaAt`,
- appends `refund_completed` to the support timeline.

## Support messaging
Customer and Partner can exchange in-app messages inside the payment support ticket.
Messages store per-side read state:
- customerReadAt
- partnerReadAt

Message bodies remain in `service_requests.details.paymentSupportTicket.messages`.
The general notification history stores only event markers and never copies private message bodies.

## SLA / ETA automation
Automation evaluator is idempotent through notification timestamp flags.

Support SLA:
- due-soon notification: within 2 hours,
- overdue notification: after SLA passes.

Refund ETA:
- due-soon notification: within 6 hours,
- overdue notification: after ETA passes.

Flags prevent duplicate events.

## Partner alerts
Partner receives in-app alerts for:
- new Customer payment-support ticket,
- new Customer support message,
- SLA due soon / overdue,
- refund ETA due soon / overdue.

## Customer alerts
Customer receives in-app alerts for:
- payment confirmed,
- refund completed,
- Partner support message,
- support stage updates,
- SLA / refund ETA events.

## Financial invariant
Refund money remains Partner merchant -> Customer.
ZhaoXi does not hold, transfer, settle or manually refund Customer funds.

## Storage
No database migration.
All new ETA/message/automation state remains in service request details and status history.
Single-language remains mandatory.
