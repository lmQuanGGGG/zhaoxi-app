# Sprint 16.38 — Housing Search, Availability & Lead Management

Cumulative release on Sprint 16.37 GREEN/READY.

## Customer Housing Search
- Adds advanced mobile filters:
  - property type,
  - minimum bedrooms,
  - minimum/maximum monthly rent,
  - desired move-in date,
  - available-only toggle.
- Adds sort modes:
  - nearest,
  - price low-to-high,
  - price high-to-low,
  - newest.
- Housing cards show the listing availability state.
- Customer can open a dedicated My Rental Inquiries page.

## Listing Availability
Housing listing metadata supports:
- `available`,
- `reserved`,
- `rented`.

Partner can change availability directly from an existing listing card.
Customer rental inquiry is accepted only when the listing remains `available`.
Backend rejects:
- unavailable/rented listings,
- reserved listings,
- requested move-in dates earlier than `availableFrom`.

## Housing Lead Pipeline
Rental inquiries keep using existing `service_requests`, with no new payment flow.
Lead stages:
- `new`,
- `contacted`,
- `viewing`,
- `negotiating`,
- `won`,
- `lost`.

Partner receives a visual pipeline and may move a lead between stages with a follow-up note.
Backend maps the Housing lead stage to the existing request status while preserving Housing-specific details and status history.

## Customer Tracking
Authenticated Customers can see their own Housing inquiries and the current Housing lead stage.
No Customer can read another Customer's Housing lead history.

## Compatibility
- No database migration is required.
- Housing listing availability remains in `services.metadata`.
- Housing lead stage remains in `service_requests.details`.
- Rental payments are still out of scope.
- Food, Restaurant Settlement and Commission logic remain unchanged.
- Single-language remains mandatory.
