# Sprint 16.17 — Customer Orders, Cart & Transaction Experience

Cumulative release on Sprint 16.16.

Backend transaction identity contract:
- New Customer service requests are bound to the authenticated ZhaoXi Customer user when a server session is present.
- Customers can retrieve their own orders through `mine=1`, reducing dependence on local request-code storage.
- Legacy request-code lookup remains supported for orders created before identity binding.
- Identity-bound order detail rejects a different authenticated Customer.
- Existing payment, delivery, Partner routing, and order status contracts remain unchanged.
