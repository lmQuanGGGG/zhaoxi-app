# Sprint 16.26 — Partner Restaurant Fulfillment & External Courier Handoff

Cumulative release on Sprint 16.25.1.

## Restaurant fulfillment
- External food orders use a dedicated Partner fulfillment contract.
- Stages: assigned -> preparing -> ready_for_pickup -> courier_booked -> handed_off -> delivered.
- `ready_for_pickup` does not complete the customer order.
- The order becomes `completed` only after Partner records delivery to the customer.
- Preparation timers automatically move external food orders to `ready_for_pickup` without entering Driver dispatch.

## External courier handoff
- Partner can record courier/provider name, phone and delivery reference.
- Courier data is stored in order details for operations visibility.
- No internal ZhaoXi Driver job is created for external orders.
- Legacy Driver APIs remain compatible with historical/legacy jobs.

## Security
- Partner operations queues require authenticated Partner/Admin sessions.
- Partner accounts are restricted to active organization membership.
- Partner fulfillment writes verify organization membership on Backend.

## Customer
- Customer Order Detail displays external fulfillment progress and courier/provider name when available.
- Notification Center translates fulfillment events into the selected locale.
- Single-language remains mandatory.

No database migration is required.
