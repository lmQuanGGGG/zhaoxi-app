ZhaoXi 19.0.0 Sprint D - Backend QR Scanner Handoff
Baseline: cb83649 (Sprint C)

Purpose
- Make ZhaoXi QR the production-capable primary login handoff for customer/partner flows.
- WeChat may scan/open the ZhaoXi HTTPS QR, but ZhaoXi does NOT claim or infer verified WeChat identity.
- Keep official WeChat Open Platform login as an optional capability for later enablement.

Security
- QR secret is short-lived and only present in the scanner URL.
- Exchange code is generated at QR creation and returned only to the initiating browser; it is never placed in the QR URL.
- Confirmation and exchange are single-use; exchange uses a conditional atomic update to prevent replay.
- Server-side ZhaoXi session cookies remain the authority after exchange.
- Scanner confirmation page is locale-pure for vi-VN, en-US, zh-CN, zh-TW.

Database
- NO schema migration.
- NO production database mutation step is required for deployment.
- Existing qr_pairing_sessions schema is reused.

Verification
npm run verify:19.0.0:sprint-d
Expected:
ZhaoXi 19.0.0 Sprint D Backend verified: ZhaoXi QR scanner handoff, single-use exchange, locale-pure confirmation, and optional WeChat capability contracts PASS.
