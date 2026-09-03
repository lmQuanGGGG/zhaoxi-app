import fs from"node:fs";
const req=["SPRINT_16_62.md","SPRINT_16_63.md","lib/services/public-partner-trust-service.ts","lib/services/partner-public-storefront-service.ts","app/api/public/partners/[organizationId]/trust/route.ts","app/api/public/partner-trust-batch/route.ts","app/api/partner-public-storefront/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.63.0")throw new Error("Backend version must be 16.63.0");
for(const x of["verify:16.63","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const pub=fs.readFileSync("lib/services/public-partner-trust-service.ts","utf8");
for(const m of["portfolio","storefront","moduleCode","moduleRoute","publicHref",'moduleCode==="food"','moduleCode==="housing"','moduleCode==="travel"',"internalTrustScore:false","internalRisk:false","complianceCases:false","adminInterventions:false"])
 if(!pub.includes(m))throw new Error(`Missing public portfolio marker ${m}`);
const settings=fs.readFileSync("lib/services/partner-public-storefront-service.ts","utf8");
for(const m of["publicTrustProfile","headline","servicePromise","showPhone","showEmail","partner_public_storefront","noTrustScoreExposure:true","noRiskExposure:true"])
 if(!settings.includes(m))throw new Error(`Missing storefront setting marker ${m}`);
console.log("Sprint 16.63 Backend Unified Partner Public Storefront & Service Portfolio structure is valid.");