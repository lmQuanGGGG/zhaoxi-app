# Chuyển từ ba repository sang zhaoxi-platform

## 1. Tạo repository GitHub

Tên đề xuất: `zhaoxi-platform` — Private, không tạo README/License.

## 2. Giải nén

Đặt tại:

```text
D:\App Giao hàng\zhaoxi-platform
```

## 3. Cài đặt và build

```bat
cd /d "D:\App Giao hàng\zhaoxi-platform"
npm run install:all
npm run build:all
```

## 4. Git

```bat
git init
git branch -M main
git add .
git commit -m "Sprint 9: initialize ZhaoXi platform monorepo"
git remote add origin https://github.com/minhkhoi2642018-creator/zhaoxi-platform.git
git push -u origin main
```

## 5. Vercel

Có thể import cùng một repository ba lần và chọn Root Directory:

- `apps/customer`
- `apps/partner`
- `apps/admin`

Giữ ba project Production hiện tại cho đến khi ba deployment mới đều `Ready`.
