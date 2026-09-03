# Sprint 16.36 — Housing & Rental Marketplace Foundation

Cumulative release on 16.35 GREEN + READY.

Housing now becomes a first-class ZhaoXi lifestyle module using the existing Services architecture.
Partner housing listings use structured metadata for property type, bedrooms, bathrooms, area, district, furnishing and deposit. Existing service price is treated as the listing rental price and existing media fields remain compatible.

No database migration is required: structured housing fields intentionally live in services.metadata so 16.36 remains backward-compatible with existing Partner catalog and Customer service APIs.

Customer nearby discovery remains location-aware and only returns active organizations / enabled services. Housing is no longer rendered through the generic lifestyle list; it has a dedicated mobile marketplace surface with property cards, search, property-type filters, bedroom filters and ZhaoXi Assistant handoff.
