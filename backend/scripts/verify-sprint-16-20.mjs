import fs from "node:fs";
const req=["SPRINT_16_19.md","SPRINT_16_20.md","lib/services/personalized-recommendation-service.ts","app/api/customer-recommendations/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.20 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.20.0")throw new Error("Backend version must be 16.20.0");
for(const x of ["verify:16.20","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const s=fs.readFileSync("lib/services/personalized-recommendation-service.ts","utf8");
for(const m of ["customerFavorites","customerBrowsingHistory","serviceRequests","reasonCode","personalizedScore","perModule"])
 if(!s.includes(m))throw new Error(`Missing personalized ranking marker ${m}`);
const r=fs.readFileSync("app/api/customer-recommendations/route.ts","utf8");
for(const m of ["authenticatedSession","session?.role","personalizedRecommendationService.list"])
 if(!r.includes(m))throw new Error(`Missing personalized API marker ${m}`);
console.log("Sprint 16.20 Backend Personalized Home & Recommendation Engine structure is valid.");
