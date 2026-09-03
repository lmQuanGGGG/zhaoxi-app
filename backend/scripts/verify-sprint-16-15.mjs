import fs from "node:fs";
const req=["SPRINT_16_14.md","SPRINT_16_15.md","lib/services/customer-ui-service.ts","app/api/customer-ui-config/route.ts","scripts/migrate-16-15.mjs"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.15 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.15.0")throw new Error("Backend version must be 16.15.0");
for(const s of ["db:apply:16.15","verify:16.15","typecheck","build"])if(!pkg.scripts?.[s])throw new Error(`Missing script ${s}`);
const schema=fs.readFileSync("db/schema.ts","utf8");
for(const m of ["customerUiSettings","bannerEffect","bannerContent","recommendationCycleSeconds"])if(!schema.includes(m))throw new Error(`Missing Customer UI schema marker ${m}`);
console.log("Sprint 16.15 Backend ZhaoXi Unified Customer Experience structure is valid.");
