# Sprint 16.20 — Personalized Home & Recommendation Engine

Cumulative release on Sprint 16.19.

- Customer Home recommendation ranking now combines Favorites, recent Browsing History, completed/current Orders, global popularity and new-partner signals.
- Customer identity is resolved from the authenticated ZhaoXi session; no extra personal identifier is sent by the client.
- Anonymous/Guest-without-history users continue to receive the safe marketplace fallback feed.
- Ranking preserves module diversity so one category cannot occupy the whole carousel.
- Recommendation items include a reason code so the UI can explain why an item was suggested in the selected locale.
- No database migration is required.
- The single-language contract remains mandatory.
