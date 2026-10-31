# ZhaoXi (app khách hàng)

Ứng dụng native (Expo SDK 57 · React Native 0.86 · expo-router) cho khách hàng ZhaoXi.
Tên hiển thị **ZhaoXi**, bundle id / package `vn.zhaoxi.app`, scheme deep link `zhaoxi://`.
Gọi thẳng backend (`/api/...` trên `EXPO_PUBLIC_API_URL`) bằng Bearer token — không đi qua proxy của PWA.

## Chạy local

1. Sao chép `.env.example` thành `.env`, điền `EXPO_PUBLIC_API_URL` (URL backend truy cập được từ máy/điện thoại) và `EXPO_PUBLIC_EAS_PROJECT_ID`.
2. Từ thư mục `frontend`: `npm install`.
3. Development build (cần cho reanimated, push, secure-store):

```bash
cd frontend/apps/customer-mobile && npx expo run:ios
```

4. Các lần sau chỉ cần Metro: `npm run dev:customer-mobile` (từ `frontend`).
5. Kiểm tra kiểu: `npm run typecheck:customer-mobile`.

> CocoaPods trên máy này cần `LANG=en_US.UTF-8` (`export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`) nếu `pod install` báo lỗi `Unicode Normalization not appropriate for ASCII-8BIT`.

## Kiến trúc

| Thư mục | Nội dung |
| --- | --- |
| `app/` | Màn hình theo file-based routing của expo-router. `(tabs)/` là 5 tab chính (Trang chủ, Khám phá, Tin nhắn, Đơn hàng, Cá nhân) với thanh tab glass tự vẽ. |
| `src/api/client.ts` | Phiên đăng nhập trong SecureStore, tự refresh token qua `/api/auth/session/refresh`, tự tạo phiên khách (`/api/auth/guest/bootstrap`) giống PWA, OTP/PIN/mật khẩu. |
| `src/api/endpoints.ts` | Hàm gọi API có kiểu dữ liệu, ánh xạ 1-1 với các proxy `frontend/apps/customer/app/api/*` của PWA. |
| `src/query.ts` | TanStack Query + persist xuống AsyncStorage: mở app là có dữ liệu ngay (stale-while-revalidate), refetch khi app trở lại foreground. |
| `src/cart.ts` | Giỏ hàng theo từng nhà hàng (cùng mô hình `@zhaoxi/cart`), cập nhật đồng bộ trong bộ nhớ (optimistic) rồi lưu nền. |
| `src/notifications.ts` | expo-notifications: xin quyền, đăng ký token với backend, kênh Android (orders/messages/promotions), mở đúng màn hình khi chạm thông báo. |
| `src/links.ts` | Chuyển đường dẫn PWA (`/order/:id`, `/messages?thread=…`, `/thue-nha`…) thành route native — dùng cho gợi ý, thông báo và push. |
| `src/i18n/` | vi-VN / zh-CN / zh-TW / en-US như PWA; tên dịch vụ/đối tác dùng chung `@zhaoxi/i18n`. |
| `src/ui/` | Hệ component: GlassCard, PressableScale (reanimated + haptics), Skeleton, Toast, Chip, QuantityStepper… |

Hiệu năng: FlashList cho danh sách dài, `expo-image` (cache memory+disk, blurhash), skeleton thay spinner, prefetch màn kế tiếp khi nhấn (nhà hàng, chi tiết dịch vụ, chi tiết đơn), optimistic update cho giỏ hàng, yêu thích, đánh dấu thông báo và gửi tin nhắn.

## Thông báo đẩy

Backend gửi Expo push (`backend/lib/services/customer-mobile-push-service.ts`) khi:

- Đối tác/admin đổi trạng thái đơn (`PATCH /api/service-requests/:id/status`).
- Nhà hàng cập nhật tiến trình món (nhận đơn, đang làm, sẵn sàng, có tài xế, đang giao, đã đến, hủy) và khi hệ thống tự chuyển "món đã sẵn sàng".
- Thanh toán: đối tác xác nhận/hoàn tiền, cập nhật ticket hỗ trợ thanh toán.
- Tin nhắn mới từ đối tác (nhà ở, du lịch, thanh toán) và trả lời của ZhaoXi hỗ trợ.
- Khuyến mãi: admin gọi `POST /api/customer-push/broadcast` với `{ copy: { "vi-VN": { title, body }, ... }, url?: "/coupons", userIds?: [] }`.

Payload luôn có `data.url` (đường dẫn kiểu PWA) để app mở đúng màn hình. Tôn trọng tùy chọn thông báo của khách (`customer_notification_preferences`) và công tắc "Nhận tin khuyến mãi" trên từng thiết bị.

## Việc cần tự làm trước khi phát hành

1. **EAS project**: `npx eas-cli init` trong thư mục app (hoặc tạo project trên expo.dev) rồi đặt `EXPO_PUBLIC_EAS_PROJECT_ID`. Không có project id thì app không lấy được Expo push token.
2. **APNs (iOS)**: `npx eas-cli credentials` → tạo/tải Push Key cho bundle `vn.zhaoxi.app`.
3. **FCM (Android)**: tạo app Android `vn.zhaoxi.app` trên Firebase, tải `google-services.json`, khai báo `android.googleServicesFile` trong `app.config.ts` và upload FCM V1 service account key lên EAS.
4. **Migration**: chạy `backend/migrations/0008_customer_mobile_push.sql` trên Postgres production trước khi deploy backend.
5. Build: `npx eas-cli build --profile preview --platform ios|android`.

## Chưa port

- WeChat Pay trong app (PWA dùng QR/WeChat JSAPI) — cần WeChat Open SDK native và merchant app id. App hiện hỗ trợ tiền mặt và chuyển khoản theo QR của quán.
- Đăng nhập WeChat/QR handoff và đổi vai trò (role switch) sang partner/admin.
- Lưu tìm kiếm có theo dõi (saved search alerts) và hub "Dành cho bạn" (`/discover`) chi tiết; Khám phá dùng chung gợi ý cá nhân hóa.

Đã port thêm (đợt 3): theo dõi yêu cầu thuê nhà (lịch xem nhà, chat Partner) và booking du lịch (thanh toán trực tiếp cho Partner, hỗ trợ thanh toán/hoàn tiền) tại `app/inquiries/[kind].tsx`; form thuê nhà và đặt tour theo lịch trống thật; bộ lọc nhà; bản đồ theo dõi tài xế (`src/components/LiveDelivery.tsx`, react-native-maps); trung tâm thanh toán; phản hồi Beta (`app/feedback.tsx`).
