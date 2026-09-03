# Sprint 10 — ZhaoXi Shared Design System

## Kết quả

- Thương hiệu và 10 module được quản lý tại `packages/branding`.
- Token giao diện và component dùng chung tại `packages/ui`.
- Customer, Partner và Admin sử dụng chung `BrandMark`, `MetricCard`, `Surface`, `StatusBadge` và `PrimaryButton`.
- Mỗi app vẫn được build và deploy độc lập từ cùng repository.

## Quy tắc từ Sprint 10

- Đổi tên, khẩu hiệu, thành phố hoặc module tại `packages/branding/src/index.ts`.
- Đổi màu, bo góc và component tại `packages/ui/src/index.tsx`.
- Không sao chép lại danh sách dịch vụ trong từng app.

## Vercel

Giữ ba Root Directory:

- `apps/customer`
- `apps/partner`
- `apps/admin`

Sau khi push, ba Vercel project sẽ tự deploy theo cùng commit.
