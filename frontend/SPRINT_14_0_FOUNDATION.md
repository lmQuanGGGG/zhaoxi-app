# Sprint 14.0 Foundation

## Delivered

- Added shared theme, platform, order, notification, hooks and configuration packages.
- Added the common `ZhaoXiFoundationApp` composition used by Customer, Partner and Admin.
- Moved the shared synchronization bootstrap out of three duplicated layouts.
- Moved theme persistence out of authentication and into `@zhaoxi/theme`.
- Added canonical order transitions, cart grouping and ETA helpers.
- Added notification deduplication contracts.
- Added WeChat runtime and QR-session contracts for Sprint 14.1 integration.
- Added architecture and permanent development rules.
- Added `npm run verify:14.0`.

## Compatibility

No database migration is required. Existing routes, storage keys, UI screens and Vercel project structure are preserved.
