ZhaoXi 19.0.0 Sprint D - Platform QR / WeChat Scanner Handoff
Baseline: 550cb43 (Sprint C)

Purpose
- Customer/Partner login uses ZhaoXi QR as the primary handoff.
- Users may scan with WeChat or Camera; copy explicitly states that WeChat is only the scanner/link opener and does not verify WeChat identity.
- Official WeChat OAuth remains compatible but is not required for this QR flow.
- Preserve Customer UI 18.3.5 design; no redesign.
- Preserve locale purity after language selection.

Security/contract
- The initiating browser keeps the one-time exchange code received at QR creation.
- Polling only observes state; it never receives a fresh exchange secret.
- Confirmed QR is exchanged into the existing server-side ZhaoXi session contract.

Verification
npm run verify:19.0.0:sprint-d
Expected:
ZhaoXi 19.0.0 Sprint D Platform verified: ZhaoXi QR / WeChat-scanner handoff, locale-pure copy, server-session exchange, and Customer UI compatibility PASS.
