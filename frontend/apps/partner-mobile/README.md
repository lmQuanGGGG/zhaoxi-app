# ZhaoXi Partner Mobile

Ứng dụng Expo riêng cho nhà hàng/partner nhận và xử lý đơn hàng.

## Chạy local

1. Sao chép `.env.example` thành `.env`, điền URL backend truy cập được từ điện thoại và EAS project ID.
2. Từ thư mục `frontend`, chạy `npm install`.
3. Chạy `npm run start --workspace=zhaoxi-partner-mobile`.

Push notification nền/đóng app và âm thanh riêng cần development build hoặc bản EAS build, không chạy đầy đủ trong Expo Go:

```bash
npx eas-cli build --profile preview --platform android
```

Backend cần chạy migration `backend/migrations/0006_partner_mobile_push.sql`. Firebase FCM (Android) và APNs (iOS) phải được cấu hình trong EAS project.
