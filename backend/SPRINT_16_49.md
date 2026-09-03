# Sprint 16.49 — Direct-to-Partner Payment Readiness & Platform Usage Fee Foundation

Cumulative release on Sprint 16.48 GREEN/READY.

## Core Payment Rule
Customer booking money is never held by ZhaoXi.

Payment routing is:
Customer -> Partner payment account / Partner gateway.

ZhaoXi/Admin:
- does not collect booking money,
- does not hold Partner receivables,
- does not settle Customer booking proceeds back to Partner,
- only manages and collects a separate platform usage fee.

## Editable Partner Platform Fee
Admin can configure Travel platform usage fee independently for each Partner:
- enabled,
- mode: percentage / fixed / hybrid,
- percentageBps,
- fixedPerBooking,
- minimumFee,
- maximumFee,
- note.

Policy is stored in `organizations.metadata.travelPlatformFeePolicy`.
No database migration is required.

## Fee Snapshot
When Partner confirms a Travel booking:
- current Partner fee policy is resolved,
- fee is calculated from booking `quotedAmount`,
- exact policy + calculated fee are snapshotted into booking details,
- booking records `paymentRouting=direct_to_partner`,
- booking records `platformDoesNotHoldCustomerFunds=true`.

Later Admin fee changes do not retroactively change old bookings.

## Fee Lifecycle
Confirmed booking:
`travelPlatformFeeStatus = accrued`

Completed booking:
`travelPlatformFeeStatus = due`

Rejected / Partner-cancelled / Customer-cancelled:
`travelPlatformFeeStatus = void`

No fee:
`not_due`

Admin can mark a Due fee as Paid.

## Platform Fee Ledger
Admin can view:
- accrued platform fee,
- due platform fee,
- paid platform fee,
- booking-level fee entries.

Partner can view:
- current fee policy,
- fee due,
- fee paid,
- confirmation that Customer payments route directly to Partner.

## Audit
Admin policy changes:
`operations_audit_logs.area = travel_platform_fee_policy`

Admin marks fee paid:
`operations_audit_logs.area = travel_platform_fee_ledger`

## Scope
This Sprint does NOT integrate a live payment gateway.
The later gateway implementation must use Partner-owned merchant/payment credentials and send booking money directly to Partner.
Single-language remains mandatory.
