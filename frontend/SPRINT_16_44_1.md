# Sprint 16.44.1 — TravelBrowser ReactNode TypeScript Hotfix

Platform-only hotfix on Sprint 16.44.

Fix:
- `metadata.maxGuests` is typed as `unknown`.
- JSX conditional rendering now explicitly narrows it with `Boolean(m.maxGuests)`.

Old:
`{m.maxGuests && <small>...</small>}`

New:
`{Boolean(m.maxGuests) && <small>...</small>}`

No Backend change.
No database migration.
No behavior change.
