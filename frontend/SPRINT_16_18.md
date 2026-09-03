# Sprint 16.18 — Customer Profile, Saved Identity & Personal Center

Cumulative release on Sprint 16.17.1.

## Personal Center
- Profile is loaded from and saved to the authenticated ZhaoXi Customer identity on the Backend.
- Customer sees a stable ZhaoXi ID, Guest/Persistent state, and profile-completion progress.
- Profile fields include name, phone, email, nationality, gender, birthday, city, usual address, WhatsApp, WeChat contact ID, and notes.
- Saving meaningful profile data promotes Guest -> persistent ZhaoXi identity under the trusted-device contract.
- Customers can store multiple addresses, choose a default address, and remove old addresses.
- Checkout automatically reuses the server-saved profile and default address before falling back to legacy local data.
- Devices & sign-in management has a dedicated Personal Center screen.
- Favorites, browsing history, and coupons receive dedicated locale-safe destinations ready for later data modules.

## Single-language contract
Every Personal Center screen, field, action, empty state, and security screen uses only the selected ZhaoXi locale. No Chinese-Vietnamese combined UI strings are allowed.
