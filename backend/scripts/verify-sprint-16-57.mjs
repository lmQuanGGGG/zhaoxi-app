import fs from"node:fs";
const req=["SPRINT_16_56.md","SPRINT_16_57.md","lib/services/payment-support-analytics-service.ts","app/api/admin-payment-support-analytics/route.ts","app/api/partner-payment-support-analytics/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.57.0")throw new Error("Backend version must be 16.57.0");
for(const x of["verify:16.57","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/payment-support-analytics-service.ts","utf8");
for(const m of["firstResponseAvgMinutes","slaMetRate","refundEtaMetRate","escalationRate","exceptionRate","qualityScore","weight:30","weight:20","weight:25","weight:15","weight:10","refundCompletedAt","await_refund"])
 if(!s.includes(m))throw new Error(`Missing analytics marker ${m}`);
const admin=fs.readFileSync("app/api/admin-payment-support-analytics/route.ts","utf8");if(!admin.includes('role!=="admin"'))throw new Error("Admin analytics auth missing");
const partner=fs.readFileSync("app/api/partner-payment-support-analytics/route.ts","utf8");if(!partner.includes('role!=="partner"'))throw new Error("Partner analytics auth missing");
console.log("Sprint 16.57 Backend Payment Support Analytics, SLA Performance & Partner Quality Score structure is valid.");