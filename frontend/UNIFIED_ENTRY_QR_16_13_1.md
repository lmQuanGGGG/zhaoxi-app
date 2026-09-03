# Unified ZhaoXi Entry QR

Public QR target:
`https://<stable-customer-production-domain>/entry`

The QR is a permanent app-entry link and does not expire.

Customer selection opens the Customer app on the same phone and Guest Bootstrap runs automatically.
Partner selection opens the Partner production URL.

Recommended Customer Vercel environment variable:
`NEXT_PUBLIC_ZHAOXI_PARTNER_URL=https://<stable-partner-production-domain>`

If omitted, the entry page attempts a conservative `customer` -> `partner` hostname replacement. Set the environment variable in Production for exact routing.

Do not use `/api/auth/qr/session` QR codes as public marketing/app-entry QR codes. Those remain short-lived security pairing codes.
