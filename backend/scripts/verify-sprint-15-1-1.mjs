import fs from 'node:fs';
const migration=fs.readFileSync('scripts/migrate-15-1.mjs','utf8');
const route=fs.readFileSync('app/api/observability/events/route.ts','utf8');
if(!migration.includes("dotenv.config({ path: '.env.local' })")) throw new Error('15.1 migration must load .env.local');
if(!migration.includes('DATABASE_URL_UNPOOLED') || !migration.includes('POSTGRES_URL_NON_POOLING')) throw new Error('15.1 migration connection fallback is incomplete');
if(!route.includes('{status:201}')) throw new Error('Observability POST must pass ResponseInit to success()');
console.log('Sprint 15.1.1 backend migration env + observability response hotfix is valid.');
