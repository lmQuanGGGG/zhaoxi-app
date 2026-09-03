# Sprint 16.23 — Customer Location, Address Intelligence & Nearby Services

Cumulative release on Sprint 16.22.

- ZhaoXi resolves Customer location in this priority: explicit current-session location -> default saved address -> profile location -> no location.
- Current browser GPS is never persisted automatically.
- Nearby service ranking uses Partner coordinates from organization metadata when available.
- Service browsing can sort by real distance while preserving services without coordinates as fallback results.
- Smart Search receives optional current-session coordinates and adds a distance score.
- Existing saved-address and checkout contracts remain compatible.
- No database migration is required.
- Single-language remains mandatory.
