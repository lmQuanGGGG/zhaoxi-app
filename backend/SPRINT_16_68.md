# Sprint 16.68 — Saved Search Alerts, Availability Watch & Smart Return Notifications

Built cumulatively on Sprint 16.67 GREEN/READY.

## Opt-in watch
A Customer may explicitly enable or disable monitoring for any Saved Search.
Watching is never enabled automatically.

When a watch is first enabled, the current matching services are seeded as baseline events so existing results do not create an immediate notification storm.

## Match evaluation
The evaluator reuses Unified Service Discovery plus Saved Search filters.

It detects:
- a new matching service,
- a meaningful public result-state change for a previously matched service.

The result-state fingerprint includes public fields such as:
- price,
- availability status,
- `isAvailable`,
- available-from date,
- available slots,
- inventory,
- sold-out state.

A new fingerprint can generate `availability_changed`.
The event uniqueness rule prevents duplicate alerts for the same state.

## Smart return notifications
When an authenticated Customer returns to ZhaoXi, the Customer alert poll evaluates that Customer's active watches.
Unread watch events are surfaced in the existing bottom-alert experience.

Event types:
- `new_match`
- `availability_changed`

Alerts link back to the Saved Search shortcut.

## Anti-spam
- Opt-in only.
- Baseline seeding prevents alerts for already-existing results.
- Unique saved-search/service/event/fingerprint constraint prevents repeated alerts for the same state.
- Turning a watch off immediately suppresses its unread watch alerts.
- Polling is Customer-scoped.

## Privacy
No external tracking, no sensitive profiling, no hidden Partner Trust/Risk/Compliance data.
Watch state is fully Customer-managed.

## Migration
Sprint 16.68 adds:
- watch state columns to `customer_saved_searches`,
- `customer_saved_search_alert_events`.

Migration required: `npm run db:apply:16.68`.

Single-language remains mandatory.
