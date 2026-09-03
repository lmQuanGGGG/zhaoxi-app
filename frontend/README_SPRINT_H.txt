ZhaoXi 19.0.0 Sprint H — Customer OTP Identity Upgrade

Baseline: Backend ff1b0ce / Platform 5e262ce.
No database migration.

Customer IdentityUpgradeSheet now consumes the backend capability contract and supports provider-gated SMS OTP and WhatsApp OTP. Phone numbers use E.164 format. OTP verification rotates the server session, refreshes the browser session as authMethod="otp", closes the sheet, and lets Sprint G resume the pending checkout without clearing cart state.

WeChat remains optional. ZhaoXi never asks for a WeChat or WhatsApp password.
