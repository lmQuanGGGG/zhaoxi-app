# Sprint 16.29 — Restaurant Promotions, Menu Scheduling & Discount Engine

Cumulative release on Sprint 16.28.

## Partner food commerce
- Each food service can have its own promotion and sale schedule.
- Supported promotions:
  - percentage discount,
  - fixed promotional unit price,
  - quantity bundle price.
- Promotions can require a minimum quantity.
- Promotions can be limited by date range, time window and weekdays.
- A separate sale schedule can make a dish unavailable outside configured sale windows.
- Partner configuration is stored inside service metadata, so no database migration is required.

## Backend authority
- Customer prices are previews only.
- When a food order is created, Backend reloads every ordered service and recomputes:
  - base item subtotal,
  - food promotion discount,
  - final item subtotal,
  - delivery gross fee,
  - restaurant delivery subsidy,
  - final order total.
- Cart items are validated to belong to the same restaurant and still be enabled/available.
- Backend rejects an order if any dish has become sold out or moved outside its sale schedule.

## Customer
- Food list, restaurant page, service detail and checkout display current promotional pricing.
- Checkout shows original item amount and promotion discount separately.
- Order Detail preserves promotion accounting after the order is created.

## Compatibility
- Restaurant Business Hours and Capacity Control 16.28 remain authoritative.
- Kitchen Queue and External Courier flows remain unchanged.
- No ZhaoXi Driver development is resumed.
- Single-language remains mandatory.
