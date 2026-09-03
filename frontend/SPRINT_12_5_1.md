# Sprint 12.5.1 — Shared Platform Core

## Shared packages

- `@zhaoxi/auth`: first-run language selection, persistent role session, partner organization binding, logout.
- `@zhaoxi/i18n`: one saved locale for the complete interface; no bilingual labels in the new core screens.
- `@zhaoxi/sdk`: one API contract for Customer, Partner and Admin.
- `@zhaoxi/ui`: shared visual primitives.

## Entry behavior

First visit: language → login → application.
Later visits: saved locale + valid saved session → application directly.

Session duration: Customer 30 days, Partner 14 days, Admin 1 day.

## Routing

A customer request must contain a service linked to an active organization. Backend creates it as `assigned` for that organization. The signed-in Partner dashboard reads only that organization queue. Admin observes the shared transaction stream.

## Security note

The current login is the shared client-side foundation for flow testing. Production identity verification and server-issued HttpOnly sessions remain the next authentication milestone.
