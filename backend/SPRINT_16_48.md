# Sprint 16.48 — Travel Admin Oversight, Package Moderation & Commercial Analytics

Cumulative release on Sprint 16.47 GREEN/READY.

## Admin Travel Oversight
Admin receives a dedicated Travel tab with:
- platform-wide experience/package inventory,
- booking funnel,
- Partner performance,
- quoted commercial value,
- confirmed value,
- completed value,
- experience quality score.

Reporting windows:
- 7 days,
- 30 days,
- 90 days.

## Commercial Analytics
Travel booking analytics derive from the existing pricing snapshot stored in each booking:
- `quotedAmount`,
- `travelBookingStage`,
- selected package,
- adults / children / guests.

Metrics include:
- Requested,
- Confirmed,
- Completed,
- Cancelled,
- Rejected,
- booking confirmation rate,
- completion rate,
- quoted value,
- confirmed value,
- completed value.

These are commercial estimates only; no Travel payment or settlement is introduced.

## Experience Moderation
Admin can:
- review,
- verify,
- unverify,
- hide,
- restore Travel experiences.

Verification requires a derived quality score of at least 80.
Hiding sets the service unpublished and locks Partner re-publish until Admin restores it.

## Package Moderation
Admin can independently moderate each package:
- verify,
- hide,
- restore.

Admin-hidden packages are disabled and cannot be re-enabled by Partner until restored.
Partner edits preserve Admin verification/review metadata.

## Quality
Experience quality checks include:
- localized name,
- description,
- cover/gallery,
- destination,
- experience type,
- duration,
- departure point,
- departure time,
- package presence,
- valid package pricing,
- valid package capacity.

## Audit
Experience moderation writes to `operations_audit_logs` using `travel_moderation`.
Package moderation writes using `travel_package_moderation`.

## Customer / Partner UX
- Customer Travel cards surface ZhaoXi Verified experiences.
- Partner Travel Inventory surfaces Admin-hidden / Platform-verified state.
- Customer booking continues to ignore disabled/hidden packages.

## Compatibility
No database migration is required.
No Travel payment is introduced.
Single-language remains mandatory.
