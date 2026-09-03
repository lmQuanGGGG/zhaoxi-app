import fs from"node:fs";
for(const f of["SPRINT_16_20.md","SPRINT_16_21.md","lib/services/customer-smart-search-service.ts","app/api/customer-search/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.21.0")throw new Error("Backend version must be 16.21.0");
for(const x of["verify:16.21","typecheck","build"])if(!p.scripts?.[x])throw new Error(x);
const s=fs.readFileSync("lib/services/customer-smart-search-service.ts","utf8");
for(const m of["customerFavorites","customerBrowsingHistory","serviceRequests","customerProfiles","moduleFilter","reasonCode","personalizedRecommendationService"])if(!s.includes(m))throw new Error(m);
console.log("Sprint 16.21 Backend Customer Search, Discovery & Smart Service Matching structure is valid.");
