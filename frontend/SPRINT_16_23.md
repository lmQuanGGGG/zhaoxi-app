# Sprint 16.23 — Customer Location, Address Intelligence & Nearby Services

Cumulative release on Sprint 16.22.

## Location contract
- Customer can explicitly choose current browser location from the mobile UI.
- Current GPS is stored only in `sessionStorage`, never silently persisted to the account or localStorage.
- When no session GPS exists, ZhaoXi falls back to the default saved address and then profile location.
- Customer can deliberately save a map/GPS coordinate with a Personal Center address.

## Nearby services
- Service Browser is powered by the authenticated Nearby Services endpoint.
- Food, Housing, Car Rental and every other service module keep their existing routing while becoming distance-aware.
- Partners with valid coordinates are sorted by real distance; partners without coordinates remain visible as fallback results.
- Distance is shown compactly in service and restaurant cards.
- Smart Search forwards current-session coordinates and uses distance as an additional ranking signal.

## Checkout
- Saved addresses appear as quick-select cards in checkout.
- Selecting a saved address reuses recipient, phone, address and stored coordinate.
- Existing map/current-location selection remains available.

Single-language remains mandatory across every location label and action.
