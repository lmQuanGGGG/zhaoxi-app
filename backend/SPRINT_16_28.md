# Sprint 16.28 — Restaurant Business Hours, Auto Pause & Order Capacity Control

Cumulative release on Sprint 16.27.

## Partner controls
- Restaurant can optionally enforce weekly business hours.
- Default behavior remains backward-compatible: business-hour enforcement is OFF until Partner enables it.
- Default schedule template is 07:00–22:00, seven days a week.
- Cross-midnight schedules are supported.
- Partner can manually pause new orders and publish a pause reason.
- Partner can configure maximum concurrent kitchen orders.
- Auto-pause blocks new food orders when active kitchen orders reach the configured capacity.
- Restaurant operations settings are stored in organization metadata; no database migration is required.

## Backend authority
- Food order creation re-checks:
  1. service availability,
  2. restaurant manual pause,
  3. business hours,
  4. kitchen capacity,
  before pricing/order creation.
- Customer UI status is informational; Backend remains authoritative.

## Customer
- Food listing, restaurant detail, service detail and checkout show Open / Paused / Closed / At capacity.
- Ordering controls are disabled while the restaurant is unavailable.
- Checkout continues to receive a final Backend rejection if the restaurant changes status between page load and submit.

## Compatibility
- Kitchen Queue 16.27 remains intact.
- External Delivery 16.25.1–16.26 remains intact.
- No ZhaoXi Driver development is resumed.
- Single-language remains mandatory.
