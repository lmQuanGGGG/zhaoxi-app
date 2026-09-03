import fs from 'node:fs';
const required=['packages/observability/index.ts','apps/admin/app/incidents/page.tsx','apps/admin/app/api/platform-observability/route.ts','apps/customer/app/api/platform-events/route.ts','apps/partner/app/api/platform-events/route.ts','apps/admin/app/api/platform-events/route.ts','apps/driver/app/api/platform-events/route.ts'];
for(const f of required){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}
for(const app of ['customer','partner','admin','driver']){const text=fs.readFileSync(`apps/${app}/app/error.tsx`,'utf8');if(!text.includes('reportRuntimeError'))throw new Error(`${app} error boundary is not reporting runtime errors`)}
console.log('Sprint 15.1 Platform Beta Observability & Incident Center structure is valid.');
