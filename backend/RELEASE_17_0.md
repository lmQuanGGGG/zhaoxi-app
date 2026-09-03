# ZhaoXi 17.0 — Major Cumulative Release

Baseline: 16.71 GREEN + READY.

This release intentionally consolidates multiple feature branches into one deployable checkpoint.

## Major scope
1. Support SLA Policy
2. Priority Routing (normal / urgent / critical)
3. SLA overdue auto-flags
4. Escalation & supervisor controls
5. Agent assignment / reassignment history
6. Smart routing recommendation by least-active agent (recommendation only; no automatic assignment)
7. Agent performance analytics
8. Support operations timeline
9. Customer support satisfaction
10. Unified Customer message + notification unread summary
11. Bottom navigation unread badge correction
12. Production compatibility / audit / financial-authority guards

## SLA defaults
- normal: first response 240 min, resolution 1440 min
- urgent: first response 60 min, resolution 480 min
- critical: first response 15 min, resolution 120 min

Admin can edit policies.

## Escalation
Threads can be escalated with reason, level and optional supervisor.
Escalation can increase priority but never changes payment, settlement or Partner funds.

## Smart routing
The queue recommends the least-active eligible Admin agent for unassigned cases.
automaticAssignment=false by design. Admin still confirms assignment.

## Customer satisfaction
Resolved ZhaoXi Support threads can receive 1–5 star Customer ratings and optional comments.

## Unified unread
Customer UI receives separate message, notification and total unread counts.
MiniTabBar Messages badge uses message unread count instead of the old mismatched notification field.

## Data / migration
Run `npm run db:apply:17.0`.
Migration is idempotent and adds SLA/escalation/history/satisfaction structures only.

## Financial invariant
Support Desk remains operational support only:
- no platform fee mutation
- no payment routing mutation
- no settlement authority
- no refund ownership
- no Partner fund control

Single-language UI remains mandatory.
