# Sprint 12.5.2 — Order, delivery location and payment core

- Direct partner routing keeps `assigned_organization_id` from `services.organization_id`.
- Food requests require recipient phone, address, quantity and coordinates.
- Request payload stores quantity, item subtotal, delivery distance, delivery fee, total amount and cash-on-delivery method in `details`.
- Partner acceptance is rejected when phone or address is missing.
- Organization code is returned for localized partner names.
- Seed metadata includes service-provider coordinates.

Delivery fee rule:
- distance <= 2 km: 15,000 VND
- distance > 2 km: 15,000 VND + 8,000 VND for each started kilometer above 2 km.
