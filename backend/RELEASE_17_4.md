# ZhaoXi 17.4 — Major Cumulative Unified Customer Operations Release

Baseline: ZhaoXi 17.3 GREEN + READY.

## Major scope
- Customer Operations Hub for Admin
- Operational task management
- Follow-up queue with due dates
- Priority and assignee controls
- Overdue and today counters
- Customer Segments
- Segment membership management
- Service Recovery cases
- Recovery severity, assignee, due date and resolution state
- Customer Operations events
- Audit logging
- Integration back into the 17.3 Customer Relationship activity timeline

## Task states
- open
- in_progress
- completed
- cancelled

Task types can include:
- follow_up
- callback
- review
- service_recovery

## Recovery states
- open
- in_progress
- resolved
- cancelled

Recovery severity:
- normal
- high
- critical

## Operational policy
Customer Operations is Admin-operated.
It does not automatically contact a Customer.
It does not automatically compensate a Customer.
It does not automatically mutate business workflow state outside its own operational task/recovery records.

## Financial invariant
Customer Operations has no authority to:
- change payment routing
- create or alter settlements
- create refunds
- change Platform Fee
- hold, move or redirect Partner funds

## Migration
Run `npm run db:apply:17.4`.
Migration is idempotent and creates Customer Operations task, segment, service recovery and event tables.
