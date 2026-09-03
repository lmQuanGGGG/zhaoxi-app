ZhaoXi 19.0.0 Sprint C - Production Integration Hardening

- Harden WeChat callback origin selection in production.
- Sanitize auth locale and relative returnUrl before persistence.
- Keep health/preflight WeChat readiness semantics identical.
- Promote integration/runtime metadata to Release 19 production contracts.
- No schema migration. No production database mutation.
