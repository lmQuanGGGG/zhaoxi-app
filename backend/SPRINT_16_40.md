# Sprint 16.40 — Housing Messaging, Lead Timeline & Appointment Notifications

Cumulative release on Sprint 16.39 GREEN/READY.

## In-app Housing Messaging
- Customer and Partner can exchange messages inside a Housing rental inquiry.
- Messages stay attached to the existing Housing lead.
- Each message stores sender role, sender user, timestamp and per-side read timestamp.
- Customer and Partner can mark incoming Housing messages read.
- Private message bodies are not copied into the general notification/status feed.

## Unified Lead Timeline
Housing follow-up history now includes:
- lead actions,
- appointment proposals/reschedules/confirms/completion/cancellation,
- message events,
- system appointment reminders.

The Housing inquiry and Partner lead pipeline render the same lead history, keeping messaging and appointment context together.

## Appointment Notifications
- Appointment `reminderAt` remains two hours before a confirmed viewing.
- Notification polling evaluates due active Housing appointments.
- A reminder is emitted only once via `reminderSentAt`.
- Reminder evaluation never emits before `reminderAt`.
- Reminder and new-message events are added to existing in-app notification infrastructure.

## Customer Alerts
- Housing inquiry request codes are persisted into Customer notification tracking after inquiry creation.
- Customer global alerts recognize:
  - new Housing Partner message,
  - viewing appointment reminder.
- Housing alerts route to My Rental Inquiries.

## Partner Alerts
- Partner receives a global in-app Housing alert for:
  - new Customer message,
  - due viewing appointment reminder.
- Housing alerts coexist with the existing Food order modal.

## Authorization and Privacy
- Customer can message/read only Housing inquiries owned by their authenticated Customer account.
- Partner can message/read only Housing inquiries assigned to an organization where they are an active member.
- Notification status-history messages never contain the private message body.

## Compatibility
- No database migration is required.
- Messaging, read state, appointment reminder state and timeline remain in `service_requests.details`.
- No automatic WhatsApp or WeChat sending is introduced.
- No rental payment is introduced.
- Single-language remains mandatory.
