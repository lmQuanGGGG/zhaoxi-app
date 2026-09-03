# Sprint 12.2.5 — Notification Center and SLA alerts

## Customer
- Real notification center at `/messages`
- Polls every 10 seconds
- Reads service request status history from the backend
- Stores read state locally without a schema migration

## Partner
- New update banner for the selected organization
- Unread count persisted in local storage
- Polls together with the operational queue

## Admin
- SLA alert for requests in `new` or `reviewing` longer than 10 minutes
- Alert chips filter the operational list by request code

## Backend
- `GET /api/notifications`
- Audience scopes: `customer`, `partner`, `admin`
