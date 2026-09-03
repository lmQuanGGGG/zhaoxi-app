# Sprint 16.44 — Tour & Local Experience Marketplace Foundation

Cumulative release on Sprint 16.43 GREEN/READY.

## Customer Travel Marketplace
- Dedicated Travel / Local Experience browser for the existing `travel` module.
- Search by destination, experience type or name.
- Compact mobile cards with destination, duration, max guests and price.
- `/services/travel` and `/du-lich` both use the dedicated Travel experience browser.
- Dedicated `/travel/[id]` detail page with gallery, destination, duration, departure point, service language, included/excluded items and experience notes.

## Travel Inquiry
Customer can submit a Travel inquiry with:
- name,
- phone,
- preferred date,
- number of guests,
- preferred contact method,
- optional WeChat / WhatsApp,
- notes.

Backend verifies:
- service belongs to `travel`,
- service is enabled,
- Partner organization is active,
- experience remains available,
- guest count does not exceed configured capacity.

Travel inquiry creates an existing `service_requests` lead with:
- `inquiryType=travel_experience_inquiry`,
- `travelLead=true`,
- `paymentRequired=false`.

## Partner Travel Content
Partner Travel service editor adds:
- experience type,
- destination,
- duration,
- departure point,
- maximum guests,
- service language,
- available days,
- start time,
- minimum booking notice,
- included items,
- excluded items.

## Compatibility
- No database migration is required.
- Travel content continues using `services.metadata`.
- Travel inquiry continues using existing `service_requests`.
- Tour payment is intentionally out of scope for this foundation Sprint.
- Single-language remains mandatory.
