# Sprint 16.27 — Restaurant Order Management, Kitchen Queue & Partner Operations

Cumulative release on Sprint 16.26.

## Kitchen queue
- Partner gets a live kitchen queue derived from authenticated external-food orders.
- Columns: Waiting, Preparing, Ready for pickup, Courier handoff.
- Queue refreshes every 5 seconds and prioritizes urgent/high orders and overdue preparation.
- Late orders are highlighted with overdue minutes.
- Partner can change kitchen priority (`normal`, `high`, `urgent`) and revise preparation ETA.

## Menu availability
- Food availability changes use a Partner-authenticated endpoint with active organization membership validation.
- Partner can mark a dish sold out or available without deleting it.
- Customer browsing already renders sold-out food as unavailable.
- Backend now re-checks `isAvailable` during order creation to prevent a stale Customer page from ordering a dish that was just sold out.

## Compatibility
- External Delivery from 16.25.1/16.26 remains unchanged.
- Non-food Partner services keep the generic operations workflow.
- No Driver app development is resumed.
- No database migration is required.
- Single-language remains mandatory.
