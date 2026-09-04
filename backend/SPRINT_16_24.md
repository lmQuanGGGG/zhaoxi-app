# Sprint 16.24 — Delivery Intelligence, Distance Pricing & Order Fulfillment

Cumulative on 16.23. Backend is authoritative for food-delivery eligibility, service radius, distance fee, ETA and total. Partner metadata may override deliveryRadiusKm, deliveryBaseFee, deliveryBaseKm, deliveryPerKmFee and preparationMinutes. Defaults: 12 km radius, 15,000 VND first 2 km, 8,000 VND per next started km. Existing driver fulfillment states and live tracking remain intact and receive the authoritative quote metadata. No database migration required.
