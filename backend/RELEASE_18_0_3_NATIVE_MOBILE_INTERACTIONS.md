# ZhaoXi Backend 18.0.3 — Native Mobile Interaction Contract

Synchronized with Platform 18.0.3.

- Adds mobile interaction metadata for phone/tablet/desktop.
- Adds query normalization (`page`, `pageSize`, `q`, `status`, `sort`, `direction`).
- Caps page size at 50 and search text at 120 characters.
- Adds authenticated `/api/platform-workspace-interactions`.
- No database migration required.
- Existing business endpoints remain compatible.
