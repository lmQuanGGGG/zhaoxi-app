# ZhaoXi Architecture 14.0

Foundation 14.0 locks the large-scale architecture. Applications remain in `apps/customer`, `apps/partner`, and `apps/admin`; reusable behavior lives in workspace packages.

## Dependency direction

`apps -> packages -> backend API`

Applications may compose screens, but shared authentication, locale, theme, notification, order, media, API and platform behavior belongs in packages.

## Foundation packages

- `@zhaoxi/platform`: application composition and WeChat runtime contracts.
- `@zhaoxi/auth`: session, role gate and shared toolbar.
- `@zhaoxi/i18n`: single-locale state and localization helpers.
- `@zhaoxi/theme`: persistent light/dark theme and design tokens.
- `@zhaoxi/ui`: reusable presentation components.
- `@zhaoxi/order`: canonical order states, transitions, ETA and cart calculations.
- `@zhaoxi/notification`: notification model and deduplication.
- `@zhaoxi/media`: shared media types and helpers.
- `@zhaoxi/sdk` / `@zhaoxi/api-client`: typed API access.
- `@zhaoxi/config`, `@zhaoxi/hooks`, `@zhaoxi/types`: common configuration, hooks and domain contracts.

## WeChat-first rule

WeChat QR/OAuth is the primary authentication direction for Customer, Partner and Admin. Foundation 14.0 defines runtime and QR-session contracts; real WeChat Open Platform credentials and callback APIs belong to Sprint 14.1.
