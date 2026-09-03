# Sprint 14.3 — Driver & Delivery Core

- Adds the fourth frontend role/app: ZhaoXi Driver.
- Extends the locked WeChat/session layer with the driver role without changing its architecture.
- Adds shared `@zhaoxi/driver` delivery state contracts.
- Driver can become available, accept a delivery, mark pickup, start delivery and complete delivery.
- Browser geolocation can update the driver's latest GPS location.
- Customer order detail reads the same delivery job and latest driver location.
- Backend remains the source of truth for assignment and delivery state.
