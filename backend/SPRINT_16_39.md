# Sprint 16.39 — Housing Viewing Appointment & Partner–Customer Follow-up

Cumulative release on Sprint 16.38 GREEN/READY.

## Viewing Appointment
Housing rental inquiries now support one current viewing appointment stored in the existing service-request details.

Appointment states:
- `proposed`
- `confirmed`
- `completed`
- `cancelled`

Customer can:
- propose a future viewing time,
- confirm a time proposed by Partner,
- cancel an active appointment.

Partner can:
- confirm a Customer proposal,
- propose/reschedule to a different future time,
- mark a confirmed viewing as completed,
- cancel an active appointment.

## Follow-up History
Each appointment action appends an immutable-style history entry into `housingFollowupHistory`:
- actor role,
- action,
- timestamp,
- optional note,
- optional scheduled time.

A matching `service_request_status_history` entry is also written for operational audit visibility.

## Reminder Foundation
Confirmed/proposed appointment data contains `reminderAt`, currently set to two hours before the scheduled viewing.
Sprint 16.39 surfaces this reminder marker in Customer and Partner UI.
Actual push/SMS/WeChat reminder delivery is intentionally not introduced yet.

## Authorization
- Customer appointment actions require the authenticated Customer to own the Housing inquiry.
- Partner appointment actions require active membership in the inquiry's assigned organization.
- Appointment actions only apply to Housing rental inquiries.

## Compatibility
- No database migration is required.
- Appointments and follow-up history remain in `service_requests.details`.
- Housing remains marketplace + lead + appointment; no rent/deposit payment is introduced.
- Food and Restaurant financial flows remain unchanged.
- Single-language remains mandatory.
