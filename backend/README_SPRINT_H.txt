ZhaoXi 19.0.0 Sprint H — Customer OTP Identity Upgrade

Baseline: Backend ff1b0ce / Platform 5e262ce.
No database migration is required.

Provider-neutral OTP adapter contract: zhaoxi-otp-adapter-v1.
Configure either or both channels:
- AUTH_SMS_OTP_PROVIDER_URL + AUTH_SMS_OTP_PROVIDER_TOKEN
- AUTH_WHATSAPP_OTP_PROVIDER_URL + AUTH_WHATSAPP_OTP_PROVIDER_TOKEN

The configured URL is a ZhaoXi OTP adapter endpoint. ZhaoXi POSTs JSON with action="start" or action="verify" and sends the provider token only server-side as Bearer authorization.
Start response must contain challengeId and may contain expiresInSeconds/resendAfterSeconds.
Verify response must contain verified:true.

Sprint H upgrades a Guest Customer to a verified phone identity, rotates the server session, preserves checkout state on the client, and never collects WhatsApp or WeChat passwords.
