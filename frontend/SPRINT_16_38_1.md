# Sprint 16.38.1 — HousingBrowser TypeScript Hotfix

Cumulative hotfix on Platform 16.38.

Fix:
- `metadata.availableFrom` is typed as `unknown`.
- JSX conditional rendering now explicitly narrows it using `Boolean(m.availableFrom)` before rendering the move-in date.

No behavior change.
No Backend change.
No database migration.
