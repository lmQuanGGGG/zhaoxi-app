# ZhaoXi 17.7 — Admin Test QR Access Checkpoint

Temporary pre-17.8 Admin test access layer.

## Behavior
- Uses the existing Backend `/api/auth/admin/card` credential exchange.
- QR credential itself has no application-level expiry.
- The same QR may be reused on multiple devices.
- Each successful scan creates an independent Admin session.
- Current Admin session refresh lifetime remains 1 day; the QR can simply be scanned again after a session expires.
- Normal Admin page keeps a manual access-code fallback.

## Security / transition
- Backend stores only SHA-256 values in `ZHAOXI_ADMIN_ACCESS_CARD_HASHES`.
- Remove or rotate that environment variable to invalidate the QR immediately.
- This checkpoint is intentionally temporary and can later be replaced by Admin Email + OTP without changing Admin business modules.
