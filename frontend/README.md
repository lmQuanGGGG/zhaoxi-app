# 赵喜 · 岘港华人生活服务平台

Monorepo trung tâm của ZhaoXi, gồm ba ứng dụng Next.js 16 độc lập và các package dùng chung.

## Ứng dụng

- `apps/customer` — khách hàng, nguyên mẫu web trước khi chuyển sang WeChat Mini Program.
- `apps/partner` — trung tâm nhà hàng và đối tác dịch vụ.
- `apps/admin` — trung tâm vận hành.

## Package dùng chung

- `packages/branding` — thương hiệu và danh mục 10 dịch vụ.
- `packages/ui` — Design System và component dùng chung.
- `packages/types` — kiểu dữ liệu chung.
- `packages/api-client` — lớp gọi API dùng chung.

## Cài đặt và build

```bat
npm run install:all
npm run build:all
```

## Chạy local

```bat
npm run dev:customer
npm run dev:partner
npm run dev:admin
```

Customer: `http://localhost:3001`  
Partner: `http://localhost:3002`  
Admin: `http://localhost:3003`

Xem `docs/SPRINT_10_DESIGN_SYSTEM.md`.
