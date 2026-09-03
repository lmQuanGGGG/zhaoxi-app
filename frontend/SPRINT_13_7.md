# Sprint 13.7 — Live Order Acceptance & Automatic Completion

## Partner
- Shared two-tab navigation is visible on Store Management and Order Management.
- The duplicate language/sign-out controls were removed from the order page; the shared top toolbar is the only account toolbar.
- New assigned orders are checked every 5 seconds on either tab and shown in a modal.
- After accepting, Partner selects 10, 15, 20, 25 or 30 minutes.
- Confirmation stores `estimatedMinutes` and `estimatedCompletionAt` in the request details.
- The same ETA selector opens when Partner presses **Nhận đơn** in the order list.

## Automatic completion
- When the ETA expires, the backend changes the request to `completed` automatically during the next request/notification read.
- The request details receive `deliveryStage: finding_courier`.
- Status history receives `AUTO_COMPLETED_FINDING_COURIER`.
- Partner does not press a manual completion button for timed orders.

## Customer
- Global order notifications are checked every 5 seconds.
- Partner acceptance displays the selected ETA.
- Order details show an ETA countdown/progress card.
- At expiry, the Customer sees **Đã hoàn thành – Đang tìm người giao hàng**.

## Deployment
This sprint changes Platform and Backend. Deploy Backend first, then Platform.
