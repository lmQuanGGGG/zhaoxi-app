# Sprint 16.69 — Customer Notification Center, Alert Preferences & Unified Inbox

Built cumulatively on Sprint 16.68 GREEN/READY.

## Unified Notification Center
Authenticated Customers now have `/notifications` with a unified inbox containing:
- Order updates,
- Housing messages/reminders,
- Travel messages/reminders/booking updates,
- Payment/support updates,
- Saved Search watch alerts.

The inbox is derived from existing request-status history plus Saved Search alert events, so notification history is durable and not limited to transient popups.

## Read / unread / hide
Customer notification receipts persist read and dismissed state without mutating the source workflow event.

Customer can:
- open a notification and mark it read,
- mark all visible notifications read,
- hide an inbox item,
- filter by category.

## Preferences
Per-Customer preferences:
- Orders,
- Housing,
- Travel,
- Payment,
- Saved Search Watch.

Preferences control Customer-facing notification delivery/inbox visibility only.
They never change Partner workflows, order state, appointments, payment state or Saved Search watch ownership.

Popup alerts also respect these preferences.

## Home
Customer Home has a direct Notification Center bell.

## Privacy
Notification data is Customer-scoped through authenticated `service_requests.customer_id` and Saved Search alert ownership.
No internal Partner Trust/Risk/Compliance data is exposed.

## Migration
Adds:
- `customer_notification_preferences`
- `customer_notification_receipts`

Migration required: `npm run db:apply:16.69`.

Single-language remains mandatory.
