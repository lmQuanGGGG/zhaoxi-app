import fs from"node:fs";
const req=["SPRINT_16_47.md","SPRINT_16_48.md","lib/services/admin-travel-oversight-service.ts","lib/services/travel-inventory-service.ts","app/api/admin-travel/route.ts","app/api/admin-travel/experiences/[id]/route.ts","app/api/admin-travel/experiences/[id]/packages/[packageId]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.48.0")throw new Error("Backend version must be 16.48.0");
for(const x of["verify:16.48","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/admin-travel-oversight-service.ts","utf8");
for(const m of["quotedValue","confirmedValue","completedValue","bookingConversionRate","completionRate","travelAdminVerified","travelAdminHidden","travel_moderation","travel_package_moderation","qualityScore","qualityIssues"])
 if(!s.includes(m))throw new Error(`Missing Admin Travel marker ${m}`);
const inv=fs.readFileSync("lib/services/travel-inventory-service.ts","utf8");
for(const m of["TRAVEL_PACKAGE_ADMIN_HIDDEN","TRAVEL_EXPERIENCE_ADMIN_HIDDEN","adminHidden","adminVerified"])
 if(!inv.includes(m))throw new Error(`Missing Travel moderation guard ${m}`);
console.log("Sprint 16.48 Backend Travel Admin Oversight, Package Moderation & Commercial Analytics structure is valid.");