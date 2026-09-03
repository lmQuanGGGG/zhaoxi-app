# Sprint 11.2A — Core database and multilingual API

## Included
- PostgreSQL/Drizzle schema for languages, cities, users, organizations, modules, services and service requests.
- Four initial locales: `zh-CN`, `zh-TW`, `vi-VN`, `en-US`.
- Initial migration and seed script for Da Nang plus 10 ZhaoXi modules.
- API routes:
  - `GET /api/languages`
  - `GET /api/modules?locale=zh-CN`
  - `GET /api/services?module=housing&locale=vi-VN`
  - `GET|POST /api/service-requests`
  - `GET /api/service-requests/:id`
  - `PATCH /api/service-requests/:id/status`

## Local setup
1. Pull Vercel variables or create `.env.local` containing `POSTGRES_URL` and, when available, `DATABASE_URL_UNPOOLED`.
2. Run:
   ```bat
   npm install
   npm run typecheck
   npm run build
   npm run db:migrate
   npm run db:seed
   ```
3. Do not commit `.env.local`.
