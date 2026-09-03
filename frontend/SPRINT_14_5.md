# Sprint 14.5 — WeChat Pay Integration

Platform consumes Payment Core 14.4 and the Backend WeChat Pay API v3 adapter.

Customer flow:
1. Customer chooses WeChat Pay only when the backend is fully configured and the order is CNY.
2. Order creation remains the same shared service-request flow.
3. The success page loads the payment transaction.
4. It requests a Native WeChat Pay checkout from the backend.
5. Backend returns a signed-provider `code_url` represented as a server-generated QR image.
6. Customer scans using WeChat.
7. WeChat asynchronous notification updates the shared payment state.
8. The page polls the existing shared payment API and changes to Paid without manual refresh.

VND orders intentionally keep WeChat Pay disabled. FX conversion is not silently performed inside the payment layer.
