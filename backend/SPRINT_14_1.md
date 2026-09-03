# Sprint 14.1 - WeChat QR Login

Foundation 14.0 remains locked. Sprint 14.1 adds WeChat QR authentication as a feature on top of the shared architecture.

## Backend
- Persistent `wechat_login_sessions` state for serverless deployments.
- `user_roles` authorization table for platform roles.
- WeChat Open Platform QR OAuth session creation and callback.
- Customer access by active WeChat identity.
- Partner access only when the WeChat user is an active organization member.
- Admin access only through `user_roles` or the temporary server-side allowlist.

## Required environment
`WECHAT_OPEN_APP_ID`, `WECHAT_OPEN_APP_SECRET`, and `WECHAT_AUTH_CALLBACK_ORIGIN` must be configured in the backend Production/Preview environments before live QR login can be used.
