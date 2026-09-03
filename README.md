# ZhaoXi

Kho mã sạch cho nền tảng ZhaoXi, chỉ gồm hai phần chính:

- `frontend`: monorepo cho Customer, Partner và Admin.
- `backend`: API, nghiệp vụ, cơ sở dữ liệu và tích hợp bên thứ ba.

Ứng dụng Driver đã được loại khỏi frontend. ZhaoXi đặt đơn vị giao hàng bên ngoài; các kiểu dữ liệu giao nhận còn lại trong backend/package dùng cho báo giá, theo dõi và tương thích dữ liệu hiện có.

## Chạy cục bộ

Yêu cầu Node.js 22.13 trở lên.

```bash
cd backend
npm ci
npm run dev -- -p 3100
```

Mở terminal khác:

```bash
cd frontend
npm ci
ZHAOXI_BACKEND_URL=http://127.0.0.1:3100 npm run dev:customer -- -p 3101
```

Partner dùng cổng `3102`, Admin dùng cổng `3103`.

## Kiểm tra trước khi deploy

```bash
cd backend
npm run verify:current
npm run typecheck
npm run build

cd ../frontend
npm run verify:current
npm run typecheck:all
npm run build:all
```

## Cấu trúc deploy đề xuất

Dùng một Git repository, tạo bốn Vercel project từ cùng repository:

| Project | Root directory |
| --- | --- |
| ZhaoXi Customer | `frontend/apps/customer` |
| ZhaoXi Partner | `frontend/apps/partner` |
| ZhaoXi Admin | `frontend/apps/admin` |
| ZhaoXi Backend | `backend` |

Không tạo project Driver.

Các biến môi trường nhạy cảm phải nhập trực tiếp trên Vercel, không commit vào Git. Tối thiểu cần cấu hình URL backend, database, khóa phiên/JWT, Supabase và Unimatrix theo từng môi trường.
