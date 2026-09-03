# Sprint 16.12.1 — Secure QR Pairing & Persistent Session Hotfix
Customer/Partner public login is ZhaoXi one-time QR pairing. The QR may be opened by WeChat, WhatsApp, or a phone camera and does not claim to receive a WeChat/WhatsApp identity. Admin uses issuer-controlled access-card hashes. WeChat OAuth remains optional. Server sessions use HttpOnly cookies through the Platform proxy.
