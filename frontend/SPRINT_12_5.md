# Sprint 12.5 — Core Platform Foundation

## Shared foundations
- `@zhaoxi/i18n`: locale normalization, browser persistence, single-language status labels.
- `@zhaoxi/sdk`: shared request, organization, status and notification API operations.
- `@zhaoxi/ui`: shared action buttons and empty states.

## Operating model
Customer selects a service → Backend routes to the service owner → Partner accepts and processes → Admin monitors exceptions and SLA.

Admin no longer performs routine assignment. Partner dashboards only request transactions assigned to the selected organization.
