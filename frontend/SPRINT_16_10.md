# Sprint 16.10 — Pre-Vercel Authentication Hardening Gate

Cumulative patch on Sprint 16.9. Existing Customer, Partner, Admin and Driver screens and all prior sprint modules remain in place.

## Platform hardening
- Adds same-origin `/api/auth/preflight` proxy to all four apps.
- Prevents overlapping WeChat QR polling requests.
- Prevents a second poll from racing with the one-time exchange step.
- Surfaces polling/API failure codes instead of silently swallowing them.
- Keeps account-login fallback and legacy session compatibility unchanged for the later consolidated Vercel test.

## Goal
Make authentication infrastructure deterministic before the first consolidated Vercel UI/function test since WeChat login was introduced.
