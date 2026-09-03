# Sprint 16.46 — Travel Messaging, Booking Timeline & Appointment Notification

Cumulative release on Sprint 16.45 GREEN/READY.

## Messaging
- Customer and Travel Partner can exchange in-app messages inside each Travel booking.
- Per-side read state is stored in `travelMessages`.
- Private message bodies are not copied into the general notification feed.

## Unified Booking Timeline
`travelTimeline` now records:
- booking requested,
- Partner confirm/reject/cancel/complete,
- Customer cancel,
- message events,
- system departure reminder.

## Departure Reminder
- Confirmed Travel bookings generate a reminder two hours before requested departure time.
- Reminder evaluation is idempotent and transaction-locked.
- `travelReminderSentAt` prevents duplicate reminders.
- Reminder events are surfaced through existing in-app notification infrastructure.

## Notifications
Customer receives in-app alerts for:
- Partner Travel message,
- confirmed booking,
- rejected booking,
- Partner cancellation,
- completed service,
- departure reminder.

Partner receives in-app alerts for:
- Customer Travel message,
- Customer cancellation,
- departure reminder.

## Customer Tracking
Travel request codes are registered with Customer notification tracking when a booking is created and when `/travel/requests` loads existing bookings.

## Scope
- No automatic WhatsApp/WeChat sending.
- No Travel payment.
- No database migration.
- Single-language remains mandatory.
