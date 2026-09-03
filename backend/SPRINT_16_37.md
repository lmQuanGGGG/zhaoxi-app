# Sprint 16.37 — Housing Listing Detail & Rental Inquiry

Cumulative release on Sprint 16.36.

## Customer Housing Detail
- Housing cards now open a dedicated `/housing/[id]` detail experience.
- Mobile-first horizontal swipe gallery reads `imageUrl + galleryUrls`.
- Property facts: bedrooms, bathrooms, area, furnishing, deposit, district, availability date and minimum lease.
- Amenities are displayed as compact chips.
- Listing address and coordinates render a map preview and external map action.
- Favorite control reuses the authenticated Customer favorites contract.
- Direct provider contact can expose phone and WeChat stored in organization metadata.
- ZhaoXi Assistant remains available for Chinese/Vietnamese communication assistance.

## Rental Inquiry
- Customer can submit a rental lead from the listing without rental payment.
- Inquiry captures:
  - customer name and phone,
  - expected move-in date,
  - requested lease months,
  - occupants,
  - monthly budget,
  - preferred contact method,
  - optional WeChat / WhatsApp,
  - notes.
- Backend verifies the service is an enabled Housing listing connected to an active Partner and still available.
- Inquiry creates a standard `service_requests` lead with `inquiryType=rental_inquiry`, `housingLead=true` and `paymentRequired=false`.
- No payment record is initialized by the dedicated Housing inquiry endpoint.

## Partner Housing
- Housing listing fields now include property address, available-from date, minimum lease, amenities and latitude/longitude.
- Existing property cards support multi-photo gallery upload and photo removal.
- Partner Operations recognizes Housing rental inquiries and shows move-in date, lease, occupants, budget and contact preference.
- Housing workflow uses lead-specific action labels: accept inquiry -> contact Customer -> complete follow-up / reject.
- Food fulfillment behavior remains unchanged.

## Compatibility
- No database migration is required.
- Housing data remains in `services.metadata`; rental leads remain in existing `service_requests`.
- No rental-payment workflow is introduced in this Sprint.
- Single-language remains mandatory.
