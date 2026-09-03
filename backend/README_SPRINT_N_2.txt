ZhaoXi 19.0.0 Sprint N.2 - Payment Provider Event Registry

Backend baseline: 01ac4ab

Scope:
- Add payment_provider_events to db/schema.ts.
- Introduce canonical forward migration 0002_payment_provider_event_registry.sql.
- Enforce unique provider + provider_event_id replay identity.
- Persist provider transaction ID, payload SHA-256, signature timestamp and nonce metadata.
- Register and hash-lock canonical 0002 in manifest.json.
- Require production attestation before 0002 may be applied.
- Preserve frozen 0000_full_schema.sql and 0001_required_bootstrap.sql hashes.
- No production database mutation in Sprint N.2.

Canonical 0002 SHA256:
7d140dfeeab4856dbccd44fec3d507a9a0496900d6931effc2ad797f36b220de

Next phase:
- N.3 makes core payment status, payment event, and request payment projection atomic.
- N.4 claims WeChat provider events once and adds webhook timestamp freshness/replay safety.

Validation:
- verify:19.0.0:sprint-n-2 PASS
- verify:19.0.0:sprint-n-1 PASS
- verify:19.0.0:sprint-m PASS
- verify:19.0.0:sprint-l PASS
- verify:19.0.0:sprint-k PASS
- typecheck PASS
- build PASS
