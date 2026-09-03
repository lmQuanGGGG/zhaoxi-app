# Sprint 16.71 — Admin Support Desk, Agent Assignment & Customer Conversation Operations

Built cumulatively on Sprint 16.70 GREEN/READY.

## Admin Support Desk
Admin Support now has a live two-way Support Desk for ZhaoXi Support threads.

Capabilities:
- support queue,
- unread counts,
- unassigned queue,
- first-response SLA queue,
- assign/unassign Admin agent,
- open / pending / resolved states,
- thread detail,
- Admin reply,
- Admin read state,
- automatic reopen when replying to a resolved thread,
- audit trail.

## SLA
First-response SLA begins when Customer creates the ZhaoXi Support thread.
Default SLA: 4 hours.

Stored:
- first_response_due_at
- first_responded_at
- resolved_at

Queue calculates overdue status from first-response SLA.

## Assignment
`assigned_admin_user_id` may point only to an active Admin role.
An Admin reply automatically self-assigns an unassigned thread.

## Read state
Customer and Admin read states remain independent:
- `customer_read_at`
- `admin_read_at`

## Compatibility
Housing, Travel and Payment Support messaging remain untouched as workflow owners.
16.71 operationalizes only ZhaoXi Support threads created in 16.70.

## Governance
Support operations are audit logged.
Support Desk has no financial authority and does not alter Partner payment routing, settlement, fees or funds.

## Migration
Migration required: `npm run db:apply:16.71`.

Single-language remains mandatory.
