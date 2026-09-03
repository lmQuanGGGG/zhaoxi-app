# Sprint 16.67 — Customer Intent Memory, Saved Searches & Smart Discovery Shortcuts

Built cumulatively on Sprint 16.66 GREEN/READY.

Customer can explicitly save a search intent with a label, query, module and lightweight filter object. Saved intents can be pinned, edited, deleted and reused. Reuse updates last-used time.

Unified Search exposes Saved Search controls and loads `q` / `module` from shortcut URLs.

Customer Home shows pinned saved intents first, falling back to recently used saved searches when nothing is pinned.

Privacy policy:
- Customer-managed only.
- No automatic intent creation.
- No sensitive profiling.
- No external tracking.

A new `customer_saved_searches` table is added. Migration is required.

Single-language remains mandatory.
