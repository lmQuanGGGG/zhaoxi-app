# Sprint 16.43 — Housing Admin Listing Moderation & Marketplace Quality Control

Cumulative release on Sprint 16.42 GREEN/READY.

## Admin Housing Moderation
Admin can review every Housing listing across the platform and apply:
- reviewed,
- verified,
- unverified,
- hidden,
- restored.

Moderation metadata is stored on the existing Housing service:
- `moderationStatus`,
- `adminVerified`,
- `adminVerifiedAt`,
- `adminHidden`,
- `adminHiddenAt`,
- `adminReviewedAt`,
- `adminReviewedBy`,
- `adminReviewNote`.

## Marketplace Quality Score
Each listing receives a derived quality score and issue list based on:
- name,
- description,
- cover image,
- gallery depth,
- property type,
- district,
- detailed address,
- monthly price,
- area,
- freshness.

Stale warnings begin after 30 days and become stronger after 60 days.

## Verification
Admin verification requires a quality score of at least 80 and a listing that is not Admin-hidden.
Verified Housing listings receive a Customer-facing ZhaoXi Verified badge and are prioritized ahead of non-verified listings for distance/newest sorting.

## Hide / Restore
Hiding a listing:
- sets `services.is_enabled=false`,
- marks `adminHidden=true`,
- removes verification,
- removes the listing from Customer Marketplace.

A Partner cannot re-publish an Admin-hidden listing. Only Admin restore removes the moderation lock.

## Partner Visibility
Partner Housing Inventory surfaces:
- platform verification,
- Admin-hidden status,
- moderation state.

The publish control is disabled while Admin has hidden the listing.

## Audit
Moderation actions are written to `operations_audit_logs` using area `housing_moderation`.

## Compatibility
No database migration is required. Moderation uses existing service metadata and audit storage.
No rental/deposit payment is introduced.
Single-language remains mandatory.
