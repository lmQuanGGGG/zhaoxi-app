# Tối ưu độ trễ API backend (2026-10-31)

## Nguyên nhân chậm chính

1. **Function và DB ở hai châu lục.** Header production `x-vercel-id: hkg1::iad1::…` cho thấy function chạy ở
   `iad1` (Washington), còn Neon nằm ở `ap-southeast-1` (Singapore). Mỗi round trip DB mất khoảng 220 ms
   (`/api/health` báo `latencyMs: 219`). Ngoài ra `postgres.js` với `prepare: false` tốn **2 round trip cho
   mỗi truy vấn có tham số** (Describe rồi Execute), nên một truy vấn đơn giản đã tốn khoảng 450 ms.
2. **Payload phình to vì ảnh QR base64.** `organizations.metadata.paymentQrUrl` lưu ảnh `data:image/png;base64`
   khoảng 317 KB. Ảnh này bị lặp lại trong **mỗi dòng** của `/api/customer-nearby-services`, nên response production
   nặng **14 MB** (5,5 s), và kéo qua đại dương ở `/api/customer-recommendations` (5,5–8,5 s) và `/api/services/[id]`.
3. **Notifications chạy 4 tác vụ quét đồng bộ trước khi trả lời.** Endpoint này được poll liên tục. Một trong các
   tác vụ là `SELECT * FROM service_requests`, đọc toàn bộ bảng.
4. **Truy vấn tuần tự và đọc thừa.** Xác thực phiên tốn 2 lượt tuần tự. `account/me` chạy 5 lượt tuần tự.
   Badge chưa đọc chạy khoảng 10 lượt tuần tự, trong đó có `SELECT *` toàn bộ `services`, `service_translations` và
   `organizations`.

## Thay đổi

| Hạng mục | File |
|---|---|
| Đặt region function là `sin1`, cùng vùng với Neon | `vercel.json` |
| Dùng lại một instance Drizzle cho mỗi server, thay vì tạo lại ở mỗi lần gọi `getDb()` | `db/index.ts` |
| Xác thực phiên: một truy vấn join `auth_sessions` + `users` + `organizations` | `lib/services/session-service.ts` |
| Thay QR base64 bằng URL `/api/organization-payment-qr` ngay trong SQL; tìm kiếm và gợi ý chỉ lấy toạ độ, banner, logo | `lib/services/organization-metadata-projection.ts`, nearby, `services/[id]`, search, smart search, recommendations |
| Gợi ý: chạy song song các truy vấn và cache danh mục đã xếp hạng 30 s trong mỗi instance | `marketplace-` và `personalized-recommendation-service.ts`, `lib/ttl-cache.ts` |
| Notifications: các tác vụ quét chạy sau khi trả response (`after()`), tối đa 1 lần mỗi 15 s; quét thanh toán chỉ đọc các đơn có ticket còn mở | `lib/background-sweeps.ts`, `app/api/notifications/route.ts`, `payment-notification-automation-service.ts` |
| `GET /api/service-requests`: giới hạn tần suất quét đơn hết hạn | `app/api/service-requests/route.ts` |
| `account/me`, message center, notification center: chạy song song và chỉ chọn cột cần dùng | `account-service.ts`, `customer-message-center-service.ts`, `customer-notification-center-service.ts` |
| Thêm `Cache-Control: public, s-maxage, stale-while-revalidate` cho dữ liệu công khai, không phụ thuộc người gọi | modules (300 s), customer-ui-config, support-config (60 s), feature-flags, services, `services/[id]`, public/discovery (30 s), runtime-control (15 s) |
| `json()` giữ nguyên `cache-control` do route đặt; mặc định vẫn là `no-store` | `lib/core/api-response.ts` |
| Index mới | `migrations/0009_api_latency_indexes.sql`, `db/schema.ts` |

Hợp đồng response được giữ nguyên. Tôi đã so sánh 26 endpoint giữa bản gốc và bản mới trên cùng một DB: JSON giống
hệt nhau. Có ba ngoại lệ:

- `paymentQrUrl` trong các response khách hàng giờ là URL thay vì `data:` URI. Đây vẫn là chuỗi dùng được trực
  tiếp làm `src` của `<img>`.
- Các trường thời gian sinh lúc trả lời (ví dụ `generatedAt` của `partner-kitchen`) khác nhau giữa hai lần gọi.
- Một số mục của `nearby-services` khác nhau trên dữ liệu thử 312 dịch vụ. Nguyên nhân là truy vấn gốc dùng
  `LIMIT 240` mà không có `ORDER BY`, nên tập dòng được chọn không cố định. Những mục có ở cả hai bản thì giống hệt
  nhau. Production chỉ có khoảng 60 dịch vụ nên không bị ảnh hưởng.

`/api/organizations` **không** đổi, vì trang StoreManager của partner đọc giá trị gốc rồi ghi lại.

## Số đo

Môi trường: Postgres 18 local, dữ liệu mô phỏng production gồm 312 dịch vụ, 20.000 đơn và 2 org có QR base64 khoảng
317 KB. Một proxy TCP chèn độ trễ: RTT 220 ms mô phỏng iad1→Singapore, RTT 2 ms mô phỏng sin1→Singapore. Bản
production build (`next start`), lấy p50 của 5 lần gọi ấm. Cột "Truy vấn" là số truy vấn SQL trung bình mỗi request.

| Endpoint | Trước (iad1) ms | Truy vấn | KB | Chỉ đổi region ms | Sau (sin1) ms | Truy vấn | KB |
|---|---:|---:|---:|---:|---:|---:|---:|
| modules | 454 | 1 | 1.9 | 13 | 12 | 1 | 1.9 |
| customer-ui-config | 454 | 1 | 0.6 | 11 | 11 | 1 | 0.6 |
| runtime-control | 452 | 1 | 0.2 | 11 | 6 | 1 | 0.2 |
| recommendations (khách vãng lai) | 1157 | 3 | 5.9 | 31 | 2 | 0 | 5.9 |
| recommendations (đã đăng nhập) | 2734 | 9 | 6 | 51 | 15 | 5 | 6 |
| services (danh sách) | 496 | 1 | 271 | 28 | 35 | 1 | 271 |
| services/[id] | 456 | 1 | **310** | 14 | 9 | 1 | **1** |
| customer-nearby-services | 512 | 1 | **7468** | 44 | 32 | 1 | **45** |
| search | 1356 | 3 | 20.4 | 24 | 10 | 3 | 20.4 |
| account/me | 3138 | 7 | 0.4 | 54 | 30 | 6 | 0.4 |
| đơn của khách (`service-requests?mine=1`) | 1360 | 4 | 5.7 | 37 | 14 | 2 | 5.7 |
| notifications (khách) | 3138 | 7 | 1.7 | 161 | 17 | 2 | 1.7 |
| customer-unread-summary | 4488 | 18 | 0.1 | 62 | 33 | 17 | 0.1 |
| hàng đợi partner | 1822 | 6 | 56.5 | 44 | 26 | 3 | 56.5 |
| notifications (partner) | 3565 | 9 | 16.7 | 154 | 27 | 3 | 16.7 |
| partner-kitchen | 1799 | 5 | 0.1 | 26 | 21 | 3 | 0.1 |
| notifications (admin) | 3604 | 8 | 38.1 | 162 | 24 | 3 | 38.1 |

Nếu vẫn ở iad1, riêng phần sửa code đã giảm thời gian 2–4 lần. Ví dụ notifications partner giảm từ 3565 ms
xuống 1351 ms, `account/me` từ 3138 ms xuống 898 ms, unread-summary từ 4488 ms xuống 1837 ms. Số liệu production
đo trước khi sửa (từ Việt Nam, gọi `zhaoxi-app-puce.vercel.app`): nearby-services mất 5,3–5,7 s cho 14 MB,
customer-recommendations 5,5–8,5 s, services 1,0–1,9 s, health 0,88 s.

## Việc cần làm trên production

1. **Chạy migration** `migrations/0009_api_latency_indexes.sql` trên Neon. Mọi lệnh đều là
   `CREATE INDEX IF NOT EXISTS`, chạy lại nhiều lần vẫn an toàn. Các bảng hiện còn nhỏ nên khoá rất ngắn. Khi bảng lớn
   hơn, có thể chạy từng lệnh với `CONCURRENTLY` (không nằm trong transaction).
2. **Region**: deploy kèm `vercel.json` (`regions: ["sin1"]`). Sau khi deploy, kiểm tra header
   `x-vercel-id: …::sin1::…`. Nếu Root Directory của project Vercel không phải `backend/`, đặt Function Region là
   Singapore (sin1) trong Project Settings → Functions. Các app frontend cũng nên ở `sin1` (session web-perf đã cấu hình).
3. **Connection pooling**: tiếp tục dùng URL `-pooler` của Neon (`POSTGRES_URL`/`DATABASE_URL`) cho function. Bật
   **Fluid compute** để instance được dùng lại: pool `postgres.js`, Drizzle và cache gợi ý 30 s đều sống theo instance.
4. **Tuỳ chọn**: PgBouncer của Neon hỗ trợ prepared statement ở mức protocol. Sau khi kiểm tra trên một branch
   Neon, có thể bật `prepare: true` để bỏ round trip Describe (mỗi truy vấn có tham số từ 2 RTT còn 1 RTT). Thay đổi
   này chưa được làm, vì chưa kiểm chứng được trên pooler production.

## Đánh đổi cần biết

- Dữ liệu công khai có thể cũ tối đa bằng thời gian `s-maxage`. Ví dụ: admin vừa sửa banner rồi tải lại trang
  trong vòng 60 s có thể vẫn thấy bản cũ; menu đã publish hiển thị cho khách chậm tối đa 30 s. Danh sách bản nháp
  của partner (`includeDrafts=1`) và mọi response phụ thuộc người gọi vẫn là `no-store`.
- Sự kiện tự động (đơn tự hoàn tất, nhắc lịch, SLA thanh toán) xuất hiện ở lần poll **kế tiếp**, chậm tối đa khoảng
  15 s cộng chu kỳ poll, thay vì ngay trong response hiện tại. Trang chi tiết đơn (`/api/service-requests/[id]`)
  vẫn quét đồng bộ, nên trạng thái hiển thị ở đó luôn đúng.
- `checked` trong kết quả `POST /api/payment-notification-automation/evaluate` giờ đếm số đơn có ticket còn mở,
  không còn đếm toàn bộ đơn.
