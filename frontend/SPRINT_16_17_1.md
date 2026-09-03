# Sprint 16.17.1 — Request Proxy Type Safety Hotfix

Cumulative hotfix on Sprint 16.17.

- Customer request collection proxy now returns a concrete `Record<string,string>` for authentication headers.
- POST headers are assembled into a typed `Record<string,string>` before `fetch`.
- Order detail proxy uses the same explicit `HeadersInit`-safe pattern.
- No transaction, cart, identity, locale, or UI behavior is removed.
