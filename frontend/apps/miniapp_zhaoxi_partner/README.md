# miniapp_zhaoxi_partner: ZhaoXi Partner chạy trong host ZhaoXi

Không có mã giao diện ở đây: `miniapp.json` trỏ `entry` sang [`../partner-mobile/src/miniapp.tsx`](../partner-mobile/src/miniapp.tsx), cùng mã với app Partner độc lập. Thiết kế và cách thử: [docs/miniapp/README.md §7–9](../../../docs/miniapp/README.md).

```bash
npm run keygen      # lần đầu: miniapp-signing.pem (không commit), thêm public key vào customer-mobile/src/miniapps/keys.ts
npm run build       # dist/ios + dist/android, ký
npm run serve       # CDN giả :8093 (host __DEV__ đọc mặc định)
npm run start       # dev server :8094 (host chạy với EXPO_PUBLIC_MINIAPP_DEV=zhaoxi.partner)
npm run typecheck   # kiểm partner-mobile với các file .miniapp.ts
```

- Quyền: `user.profile` (biết tài khoản host để gắn phiên partner), `auth.handoff` (xin mã đổi sang phiên partner).
- Khác biệt với app độc lập nằm trong `partner-mobile/src/*.miniapp.ts(x)`: ảnh nhúng, three.js qua CDN, kính Liquid Glass.
