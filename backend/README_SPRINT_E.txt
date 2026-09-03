ZhaoXi 19.0.0 Sprint E — QR Authentication Gate & Production E2E

- Cumulative over Backend c23159f.
- No database migration.
- QR scan is not identity proof and can never mint Partner privilege.
- Customer QR may bootstrap a ZhaoXi guest identity.
- Partner QR requires a previously trusted ZhaoXi identity with an active Partner role.
- Sprint D single-use exchange and optional WeChat contracts remain intact.
