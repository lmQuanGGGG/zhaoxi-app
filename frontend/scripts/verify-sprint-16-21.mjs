import fs from"node:fs";
for(const f of["SPRINT_16_20.md","SPRINT_16_21.md","apps/customer/app/search/page.tsx","apps/customer/app/api/customer-search/route.ts","apps/customer/app/services.module.css","apps/customer/app/support/page.tsx"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.21.0")throw new Error("Platform version must be 16.21.0");
for(const x of["verify:16.21","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(x);
const s=fs.readFileSync("apps/customer/app/search/page.tsx","utf8");for(const m of["/api/customer-search","smartSearchFilters","searchAssistantCard","recent_view","nearby","/support?topic=service"])if(!s.includes(m))throw new Error(m);
const proxy=fs.readFileSync("apps/customer/app/api/customer-search/route.ts","utf8");if(!proxy.includes('request.cookies.get("zx_access_v2")'))throw new Error("Search proxy must forward Customer identity");
const support=fs.readFileSync("apps/customer/app/support/page.tsx","utf8");if(!support.includes('q.get("query")')||!support.includes("initialPrompt={initialPrompt}"))throw new Error("Search query must hand off to ZhaoXi Assistant");
console.log("Sprint 16.21 Platform Customer Search, Discovery & Smart Service Matching structure is valid.");
