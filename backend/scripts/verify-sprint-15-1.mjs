import fs from 'node:fs';
const required=['lib/services/observability-service.ts','app/api/observability/events/route.ts','app/api/observability/summary/route.ts','scripts/migrate-15-1.mjs'];
for(const f of required){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}
const schema=fs.readFileSync('db/schema.ts','utf8');if(!schema.includes('runtimeEvents'))throw new Error('runtimeEvents schema missing');
console.log('Sprint 15.1 Backend Beta Observability & Incident Center structure is valid.');
