# Sprint 16.25.1 — External Delivery Pricing Policy & Google Maps Distance Contract

Cumulative hotfix/refactor on Sprint 16.25.

## Delivery direction
- New food orders no longer enter ZhaoXi's internal Driver dispatch.
- Legacy Driver APIs and existing delivery jobs remain available as compatibility paths for previously created data.
- New food orders use `deliveryFulfillmentMode = external_manual` and `driverDispatchRequired = false`.
- External courier selection (Grab, Xanh SM, another provider, or manual booking) remains outside the ZhaoXi Driver app.

## Distance
- Backend prefers Google Maps Platform Routes API `computeRoutes` using `DRIVE`.
- The server requests only `routes.distanceMeters` and `routes.duration`.
- API credentials remain server-side in `GOOGLE_MAPS_ROUTES_API_KEY` (fallback `GOOGLE_MAPS_API_KEY` is accepted).
- If Google is not configured/unavailable, optional geographic fallback keeps development/test flows usable and clearly records `distanceProvider = geo_fallback`.

## Default pricing policy
- First 2 km: 15,000 VND.
- Each started km beyond 2 km: +8,000 VND/km.
- Restaurant subsidy cap: 20,000 VND during 07:00–10:00 and 13:00–16:00.
- Timezone: Asia/Ho_Chi_Minh.
- Maximum delivery radius: 12 km.
- Subsidy cannot exceed the gross delivery fee.
- Customer total = item subtotal + gross delivery fee - restaurant subsidy.

## Administration
All pricing values and subsidy windows are stored in `delivery_pricing_policies` and can be changed by Admin without a new release.

## Security
The frontend quote is informational. When the order is created, Backend recomputes distance, pricing, subsidy and total before persisting the order.
