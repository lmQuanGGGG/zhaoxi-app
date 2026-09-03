# Sprint 16.21 — Customer Search, Discovery & Smart Service Matching

Cumulative release on Sprint 16.20.

- Search is authenticated when a ZhaoXi Customer session is present.
- Ranking combines text relevance with Favorites, recent Browsing History, Orders and saved Customer city.
- Empty/short queries return the personalized discovery feed rather than a blank page.
- Search supports module filtering while preserving correct service routing.
- Search results carry a locale-neutral reason code; Platform renders the explanation in the selected locale.
- ZhaoXi Assistant remains the fallback when a Customer cannot find the right service.
- No database migration is required.
- Single-language remains mandatory.
