# Sprint 15.2 — Beta User Feedback & Release Channel

- Persistent beta feedback records for Customer, Partner, Driver and Admin.
- Feedback is tagged by app, route, release and release channel.
- Admin can review and move feedback through new/reviewing/planned/resolved/closed.
- `/api/release-channel` exposes safe deployment metadata.
- `ZHAOXI_RELEASE_CHANNEL` supports `stable`, `beta` or `canary`; default is `beta`.
