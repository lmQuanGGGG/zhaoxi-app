# Sprint 16.11 — Pre-Production Integration Gate

Sprint 16.11 is a cumulative, non-feature sprint built directly on the green Sprint 16.10 baseline.

Goals:
- preserve all prior release/audit/operations functionality;
- require WeChat App ID, secret and a valid callback origin before reporting WeChat ready;
- expose `/api/integration/preflight` without secrets;
- validate required cross-domain tables before Vercel E2E;
- freeze new business features after this sprint until the first consolidated Vercel test pass.

`db:apply:16.11` is intentionally non-destructive. It validates the required schema objects and makes no schema mutation.
