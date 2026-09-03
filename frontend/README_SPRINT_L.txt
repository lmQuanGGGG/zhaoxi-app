ZhaoXi 19.0.0 Sprint L - Transactional Request CAS Platform Compatibility

Backend Sprint L baseline: abe3cab
Platform baseline: f4a34c0

Scope:
- Preserve Backend authority for transactional request state transitions.
- Partner and Admin status BFFs preserve Backend HTTP conflict status.
- Partner and Admin assignment BFFs preserve Backend HTTP conflict status.
- ZhaoXi SDK rejects non-2xx mutation responses and surfaces them as exceptions.
- Partner operations catches failed status mutations and reloads only after success.
- Admin operations catches failed status mutations and reloads only after success.
- No Platform request-state implementation is duplicated.
- No schema change.
- No canonical migration 0002.
- No production database mutation.

Validation:
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- verify:19.0.0:sprint-j PASS
- typecheck:all PASS
- build:all PASS
