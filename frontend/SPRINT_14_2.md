# Sprint 14.2 — Authentication & Session Lock

Sprint 14.2 locks ZhaoXi authentication/session architecture. Customer, Partner and Admin now use the same server-backed session contract after WeChat QR authentication. Long-lived credentials are never returned to React: each Next.js app stores access/refresh credentials in HTTP-only SameSite cookies through one same-origin auth proxy.

## Locked behavior
- WeChat QR identity is exchanged once for a server session.
- Access credentials are short lived and refreshed by the same-origin proxy.
- Refresh credentials live only in HTTP-only cookies.
- Role and organization context come from the backend.
- Device ID is persisted locally only as non-secret metadata.
- Logout, logout-all and device session listing use the unified session API.
- Account login remains as a compatibility fallback; new authentication work must use the server-session API.

No future sprint should introduce a second session engine.
