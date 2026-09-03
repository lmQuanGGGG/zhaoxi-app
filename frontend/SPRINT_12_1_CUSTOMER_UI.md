# Sprint 12.1 — ZhaoXi Customer UI

Implemented:
- Mobile-first WeChat-style customer home.
- Four-language selector: zh-CN, zh-TW, vi-VN, en-US.
- 10 service modules with local fallback.
- Server-side proxy route to ZhaoXi backend modules API.
- Five-tab bottom navigation: Home, Explore, Messages, Orders, Profile.
- Search/explore screen, profile hub, and language settings.
- Responsive layout optimized for 360–480 px mobile screens.

Optional Vercel variable:
- ZHAOXI_BACKEND_URL=https://zhaoxi-backend.vercel.app

Validation on Windows:
1. npm install
2. npm run typecheck --workspace=zhaoxi-customer
3. npm run build:customer
4. git add .
5. git commit -m "Sprint 12.1: implement ZhaoXi customer mobile UI"
6. git push origin main
