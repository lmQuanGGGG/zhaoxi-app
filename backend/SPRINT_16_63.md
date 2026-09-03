# Sprint 16.63 — Unified Partner Public Storefront & Service Portfolio

Built cumulatively on Sprint 16.62 GREEN/READY.

## Unified Partner storefront
The public Partner profile is now a unified service storefront rather than a verification-only page.

Public storefront includes:
- Partner public identity,
- active manually verified badges,
- public headline / description / service promise,
- optional public contact visibility,
- enabled service count,
- module-based portfolio,
- service cards with localized names and summaries,
- direct links to the correct service experience.

## Portfolio grouping
Enabled services are grouped by module:
- Food / Restaurant
- Housing
- Travel
- Other enabled service modules

Each service receives a publicHref derived from its module:
- food -> Partner Restaurant page
- housing -> Housing detail
- travel -> Travel detail
- other -> module route + service id

This provides one Partner entry point across ZhaoXi modules.

## Verified service identity
Restaurant, Housing and Travel customer surfaces reuse `VerifiedPartnerIdentity`.
Compact verified identity links directly to the Partner storefront.

Only active, non-expired manually issued badges are visible publicly.

## Partner storefront settings
Partner can manage Customer-safe public presentation:
- headline,
- public description,
- service promise,
- operating-since text,
- website,
- logo URL,
- cover URL,
- optional phone visibility,
- optional email visibility.

Changes are authorization checked and audit logged.

## Privacy
Public storefront never exposes:
- internal Trust Score,
- risk level / flags,
- compliance cases,
- corrective action plans,
- Admin interventions,
- internal Admin notes.

## Financial / commercial invariants
Storefront and verification identity do not automatically:
- alter search ranking,
- alter platform usage fee,
- alter payment routing,
- create settlement authority,
- control Partner funds.

## Migration
No database migration.
Public storefront configuration remains in organization metadata.

Single-language remains mandatory.
