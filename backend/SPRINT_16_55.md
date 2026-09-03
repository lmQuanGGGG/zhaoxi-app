# Sprint 16.55 — Payment Dispute, Refund Tracking & Customer Payment Support

Cumulative on 16.54 GREEN/READY.

Customer can open one active payment support ticket per Travel booking, categorized as payment or refund support. Tickets include a 24-hour Partner SLA, timeline, Partner organization, direct-to-Partner invariant and no platform fund custody.

Partner can move support through:
open -> partner_review -> awaiting_refund -> resolved / escalated / closed.

Customer can see the current ticket stage, SLA due time and recent timeline entries in Travel booking tracking.

Admin can monitor all active payment-support tickets, detect SLA overdue items and escalate operationally. Admin escalation never moves funds and records `fundsMovedByAdmin=false`.

Refund tracking remains based on payment status/operation data created in 16.54. ZhaoXi coordinates support only; refund money remains Partner merchant -> Customer.

No database migration. Ticket state is stored in service_requests.details.paymentSupportTicket.
Single-language remains mandatory.
