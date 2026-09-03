# Kiến trúc 赵喜 Platform

```text
Customer Web / WeChat Mini Program ─┐
Partner Center ──────────────────────┼── Shared Backend API ── PostgreSQL
Admin Center ────────────────────────┘
```

## Phạm vi MVP

Ưu tiên sáu dịch vụ:

1. 外卖订餐 — đặt món
2. 岘港租房 — thuê nhà
3. 护照签证 — hộ chiếu và thị thực
4. 租车服务 — thuê xe
5. 翻译服务 — phiên dịch
6. 旅游服务 — du lịch

Các module thanh toán, cộng đồng, chợ Người Hoa và hỗ trợ khẩn cấp giữ trong kiến trúc nhưng triển khai sau.
