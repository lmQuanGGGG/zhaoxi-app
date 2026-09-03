ZhaoXi 19.0.0 Sprint F Backend
Guest-first Customer + Identity Upgrade foundation.
- Customer guest bootstrap is customer-only; it cannot mint Partner privilege.
- Server sessions expose guest authMethod for guest identities.
- Identity capability endpoint advertises SMS OTP, WhatsApp OTP and WeChat OAuth availability without collecting third-party passwords.
- No database migration.
