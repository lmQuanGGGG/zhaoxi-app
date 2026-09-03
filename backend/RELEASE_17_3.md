# ZhaoXi 17.3 — Major Cumulative Unified Customer Identity, Activity Timeline & Service Relationship Hub

Baseline: ZhaoXi 17.2 GREEN + READY.

## Major scope
- Admin Customer Relationship Hub
- Unified first-party Customer operational identity
- Customer search with request/support activity counts
- Cross-module relationship summary
- Housing / Travel / Payment / Support counters
- Unified activity timeline from service requests, support, favorites, recently viewed services and saved searches
- Internal relationship stage: active / priority / follow_up / dormant
- Admin operational tags and operational note
- Relationship change history
- Audit log for relationship profile changes
- Privacy and authority guards

## Privacy model
The hub aggregates ZhaoXi first-party service activity already held for product operations.
It does not expose credentials, tokens, secrets, external browsing history, device surveillance, or unrelated third-party data.
Admin relationship notes are operational-only.

## Financial invariant
The Relationship Hub has no authority to:
- change Partner payment routing
- change settlements
- create refunds
- change platform fees
- hold or move Partner funds

## Migration
Run `npm run db:apply:17.3`.
Migration is idempotent and creates customer relationship profile/event tables.
