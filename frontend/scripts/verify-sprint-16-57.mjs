import fs from"node:fs";
const req=["SPRINT_16_56.md","SPRINT_16_57.md","apps/admin/app/PaymentSupportAnalyticsPanel.tsx","apps/admin/app/TravelOversightPanel.tsx","apps/admin/app/api/admin-payment-support-analytics/route.ts","apps/partner/app/PartnerPaymentSupportAnalytics.tsx","apps/partner/app/OperationsBoard.tsx","apps/partner/app/api/partner-payment-support-analytics/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.57.0")throw new Error("Platform version must be 16.57.0");
for(const x of["verify:16.57","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const a=fs.readFileSync("apps/admin/app/PaymentSupportAnalyticsPanel.tsx","utf8");
for(const m of["admin-payment-support-analytics","qualityScore","slaMetRate","refundEtaMetRate","firstResponseAvgMinutes","escalationRate","exceptionRate"])
 if(!a.includes(m))throw new Error(`Missing Admin analytics UI ${m}`);
const pa=fs.readFileSync("apps/partner/app/PartnerPaymentSupportAnalytics.tsx","utf8");
for(const m of["partner-payment-support-analytics","qualityScore","slaMetRate","refundEtaMetRate"])if(!pa.includes(m))throw new Error(`Missing Partner analytics UI ${m}`);
if(!fs.readFileSync("apps/admin/app/TravelOversightPanel.tsx","utf8").includes("<PaymentSupportAnalyticsPanel/>"))throw new Error("Admin analytics not mounted");
if(!fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8").includes("<PartnerPaymentSupportAnalytics organizationId={orgId}/>"))throw new Error("Partner analytics not mounted");
console.log("Sprint 16.57 Platform Payment Support Analytics, SLA Performance & Partner Quality Score structure is valid.");