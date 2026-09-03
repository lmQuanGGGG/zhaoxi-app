# Sprint 16.22 — Notification Center, Real-time Customer Updates & Deep Linking

Cumulative release on Sprint 16.21.

- Customer Notification Center is bound to authenticated ZhaoXi Customer identity.
- Order status, payment status and ZhaoXi Assistant replies are merged into one feed.
- Read/deleted state persists server-side per Customer instead of localStorage.
- Each event carries a deep link to the exact Order or Assistant conversation.
- Feed returns unread count for Customer navigation badges.
- Existing legacy `/api/notifications` remains available for compatibility with Partner/Admin flows.
- Single-language remains mandatory.
