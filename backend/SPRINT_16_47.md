# Sprint 16.47 — Travel Partner Inventory, Pricing & Package Management

Cumulative release on Sprint 16.46 GREEN/READY.

## Dedicated Travel Inventory
Partner gains a dedicated Travel Inventory workspace independent from generic StoreManager.

Travel inventory manages:
- experience name,
- destination and type,
- operating weekdays,
- multiple departure times,
- blackout dates,
- publish/unpublish state,
- package pricing.

## Packages
Each Travel experience can contain multiple enabled/disabled packages.

Package fields:
- package id and name,
- pricing mode: per_person or group,
- adult price,
- child price,
- flat group price,
- per-booking surcharge,
- minimum guests,
- maximum guests.

`services.price_from` is recalculated from the lowest enabled package headline price for marketplace discovery.

## Booking Pricing Snapshot
Customer selects a package and adult/child counts before submitting a booking request.

Backend stores a pricing snapshot in the Travel booking:
- packageId / packageName,
- pricingMode,
- adultPrice,
- childPrice,
- groupPrice,
- surchargePerBooking,
- adults / children / guests,
- quotedAmount.

This is a quote only; Travel payment remains disabled.

## Inventory Guardrails
- Blackout dates are excluded from public availability.
- Direct booking requests on blackout dates are rejected server-side.
- Package min/max guest limits are validated server-side.
- Existing slot capacity protection remains active.

## Storage
No database migration is required.
Travel inventory/packages remain in `services.metadata.travelPackages` and `services.metadata.blackoutDates`.
Travel booking pricing snapshots remain in `service_requests.details`.

## Product Rules
- No Travel payment yet.
- Single-language remains mandatory.
