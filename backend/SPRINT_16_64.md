# Sprint 16.64 — Unified Service Discovery, Partner Storefront Search & Cross-Module Recommendations

Built cumulatively on 16.63 GREEN/READY.

Public discovery searches enabled services and active Partner storefronts across ZhaoXi modules from one endpoint. Results include localized service identity, Partner identity, module, public destination, price, image and public verification presence.

Customer unified search at /search can discover Food/Restaurant, Housing, Travel and other enabled service modules, plus matching Partner storefronts.

Recommendations provide:
- more services from the same Partner,
- related services from the same module,
- cross-module discovery.

Housing and Travel details include cross-module recommendations. The recommendation component is reusable by future service detail surfaces.

Discovery privacy excludes internal Trust Score, risk and compliance data. Public verification badge presence can be shown as identity context but Trust Score is not a ranking signal.

There is no paid placement or commercial boost in this sprint. Discovery does not change platform fees, payment routing, settlement or fund ownership.

No database migration. Single-language mandatory.
