import fs from"node:fs";
for(const f of["SPRINT_16_65.md","SPRINT_16_66.md","lib/services/customer-home-personalization-service.ts","app/api/customer-home-feed/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.66.0")throw new Error("Backend version");
for(const x of["verify:16.66","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/customer-home-personalization-service.ts","utf8");
for(const m of["smartResume","recentlyViewedPartners","favorites","recentlyViewed","forYou","customerControlled:true","clearableHistory:true","firstPartyOnly:true","noSensitiveProfiling:true","noExternalTracking:true","noPaidPlacement:true","noInternalTrustScoreBoost:true"])if(!s.includes(m))throw new Error(`Missing ${m}`);
console.log("Sprint 16.66 Backend Customer Home Personalization, Unified Home Feed & Smart Resume structure is valid.");