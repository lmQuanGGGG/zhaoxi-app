import fs from"node:fs";
const req=["SPRINT_16_42.md","SPRINT_16_43.md","lib/services/housing-moderation-service.ts","lib/services/housing-inventory-service.ts","app/api/admin-housing-listings/route.ts","app/api/admin-housing-listings/[id]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.43.0")throw new Error("Backend version must be 16.43.0");
for(const x of["verify:16.43","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const moderation=fs.readFileSync("lib/services/housing-moderation-service.ts","utf8");
for(const m of["qualityScore","qualityIssues","adminVerified","adminHidden","moderationStatus","housing_moderation","HOUSING_QUALITY_TOO_LOW_TO_VERIFY","stale_over_30_days","stale_over_60_days"])
 if(!moderation.includes(m))throw new Error(`Missing moderation marker ${m}`);
const inventory=fs.readFileSync("lib/services/housing-inventory-service.ts","utf8");
if(!inventory.includes("HOUSING_LISTING_ADMIN_HIDDEN")||!inventory.includes("current.adminHidden===true"))throw new Error("Partner Admin-hidden republish guard missing");
const list=fs.readFileSync("app/api/admin-housing-listings/route.ts","utf8"),item=fs.readFileSync("app/api/admin-housing-listings/[id]/route.ts","utf8");
if(!list.includes('role!=="admin"')||!item.includes('role!=="admin"'))throw new Error("Admin Housing moderation auth missing");
console.log("Sprint 16.43 Backend Housing Admin Listing Moderation & Marketplace Quality Control structure is valid.");