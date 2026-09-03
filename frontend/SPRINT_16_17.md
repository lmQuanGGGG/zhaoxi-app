# Sprint 16.17 — Customer Orders, Cart & Transaction Experience

Cumulative release on Sprint 16.16.

Customer transaction contracts:
- New Customer orders are associated with the authenticated ZhaoXi identity.
- Order history requests `mine=1` and also supplies legacy request codes for backward compatibility.
- Cart is grouped per restaurant, supports quantity editing, per-restaurant clearing, and independent checkout.
- Successful restaurant checkout clears only the submitted restaurant cart.
- Orders hub provides active/completed/cancelled filters, counts, transaction value summary, and 10-second refresh.
- Order detail and request-success retain the global navigation system and selected locale.
- ZhaoXi Assistant is available from order detail.
- Single-language remains mandatory across cart, checkout, payment, order status, and transaction history.
