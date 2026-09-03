# Sprint 16.25 — Driver Dispatch, Live Tracking & Fulfillment Control

Cumulative release on Sprint 16.24.

- Available delivery jobs are ranked by the Driver's live distance to pickup when GPS is available.
- Drivers must be `available`, cannot hold another active job, and job acceptance uses status-guarded updates.
- Delivery lifecycle events are persisted separately in `delivery_job_events`.
- Tracking ETA targets pickup before collection and drop-off after collection.
- Customer tracking exposes live/stale GPS state and a delivery timeline.
- Driver assignment and delivery-stage notes become localized Customer notifications.
- Existing Delivery Pricing, Orders, QR, Profile, Search and Notification contracts are preserved.
- Single-language remains mandatory.
