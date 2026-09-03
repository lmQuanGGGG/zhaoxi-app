import fs from"node:fs";
const req=["SPRINT_16_41.md","SPRINT_16_42.md","lib/services/housing-inventory-service.ts","app/api/partner-housing-listings/route.ts","app/api/partner-housing-listings/[id]/route.ts","lib/services/housing-analytics-service.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.42.0")throw new Error("Backend version must be 16.42.0");
for(const x of["verify:16.42","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/housing-inventory-service.ts","utf8");
for(const m of["PARTNER_FORBIDDEN","housingAvailabilityStatus","isPublished","syncStatus","publishedAt","inventoryUpdatedAt","housing_inventory","galleryUrls","operationsAuditLogs","Object.prototype.hasOwnProperty"])
 if(!s.includes(m))throw new Error(`Missing Housing inventory marker ${m}`);
const route=fs.readFileSync("app/api/partner-housing-listings/route.ts","utf8");if(!route.includes('role!=="partner"')||!route.includes("housingInventoryService.create"))throw new Error("Partner Housing inventory auth/create missing");
const item=fs.readFileSync("app/api/partner-housing-listings/[id]/route.ts","utf8");if(!item.includes("housingInventoryService.update")||!item.includes("housingInventoryService.archive"))throw new Error("Housing inventory update/archive missing");
const analytics=fs.readFileSync("lib/services/housing-analytics-service.ts","utf8");if(!analytics.includes("housingAvailabilityStatus"))throw new Error("Housing analytics not aligned to canonical inventory status");
console.log("Sprint 16.42 Backend Housing Listing Management & Partner Inventory Control structure is valid.");