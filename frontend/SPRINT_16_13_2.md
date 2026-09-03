# Sprint 16.13.2 — Unified Entry Locale Synchronization

- Permanent QR target is the public production URL: `https://zhaoxi-customer.vercel.app/entry`.
- `/entry` displays one selected language at a time, never forced Chinese + Vietnamese bilingual copy.
- Supported languages: Simplified Chinese, Traditional Chinese, Vietnamese, English.
- Language is stored on the entry origin and passed as `?lang=` when switching to Customer or Partner.
- PlatformGate consumes `?lang=`, saves it into ZhaoXi i18n storage/cookie, then Guest Bootstrap and all following screens use the same locale.
- Customer and Partner therefore remain synchronized even though they use different Vercel domains.
