# Sprint 16.45 — Travel Availability, Schedule & Booking Lead Management

Cumulative release on Sprint 16.44 GREEN/READY.

## Availability
- Travel experiences use Partner-configured `availableDays`, `startTimes`/`startTime`, `maxGuests`, `bookingNoticeHours`, and `travelAvailabilityStatus`.
- Public availability API generates date/time slots for up to 60 days.
- Remaining capacity is calculated from confirmed Travel bookings.
- Customer only sees slots that can fit the selected party size.

## Booking Request
Travel inquiry now records:
- requested date,
- requested time,
- guests,
- `travelBookingStage=requested`.
Backend validates allowed weekday, start time, booking notice, experience availability and maximum party size.

## Partner Booking Management
Dedicated Partner Travel pipeline:
- Requested,
- Confirmed,
- Completed,
- Cancelled,
- Rejected.

Partner can confirm, reject, complete, or cancel.
Confirmation uses a PostgreSQL advisory transaction lock per service/date/time and re-checks confirmed guest capacity before accepting, preventing concurrent overbooking.

## Customer Tracking
Customer has `/travel/requests` for their Travel booking requests and can cancel active requests.

## Partner Schedule Controls
Travel service editor adds multiple start times and experience availability controls in addition to the 16.44 operational fields.

## Compatibility
- No database migration.
- Schedule configuration stays in `services.metadata`.
- Booking state stays in `service_requests.details`.
- No Travel payment yet.
- Single-language remains mandatory.
