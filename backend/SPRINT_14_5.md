# Sprint 14.5 — WeChat Pay API v3 Integration

Connects Payment Core 14.4 to WeChat Pay Native API v3 without changing Foundation/Auth/Delivery architecture.

- RSA-SHA256 merchant request signing.
- Native transaction creation at `/v3/pay/transactions/native`.
- Signed WeChat response verification.
- Server-side QR image generation from `code_url`.
- Signed asynchronous callback verification.
- AES-256-GCM API v3 resource decryption.
- Merchant/app/amount/currency validation before payment completion.
- Shared Payment Service remains the single source of payment state.

Required production variables:
`WECHAT_PAY_MCH_ID`, `WECHAT_PAY_APP_ID`, `WECHAT_PAY_MERCHANT_SERIAL_NO`, `WECHAT_PAY_PRIVATE_KEY`, `WECHAT_PAY_API_V3_KEY`, `WECHAT_PAY_PLATFORM_PUBLIC_KEY`, `WECHAT_PAY_PLATFORM_KEY_ID`, and `ZHAOXI_BACKEND_PUBLIC_URL` (or explicit `WECHAT_PAY_NOTIFY_URL`).

Never commit real keys or certificates.

Native API v3 is CNY-denominated for mainland merchant mode. ZhaoXi therefore only enables WeChat checkout when the payment currency is CNY. VND remains COD/bank-transfer until a separately reviewed pricing/FX feature is introduced.
