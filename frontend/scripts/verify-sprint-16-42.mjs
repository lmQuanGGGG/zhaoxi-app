import fs from"node:fs";
const req=["SPRINT_16_41.md","SPRINT_16_42.md","apps/partner/app/housing-inventory/page.tsx","apps/partner/app/housing-inventory/HousingInventoryManager.tsx","apps/partner/app/PartnerWorkspaceNav.tsx","apps/partner/app/api/partner-housing-listings/route.ts","apps/partner/app/api/partner-housing-listings/[id]/route.ts","apps/customer/app/api/customer-nearby-services/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.42.0")throw new Error("Platform version must be 16.42.0");
for(const x of["verify:16.42","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const ui=fs.readFileSync("apps/partner/app/housing-inventory/HousingInventoryManager.tsx","utf8");
for(const m of["housingAvailabilityStatus","galleryUrls","isPublished","partner-housing-listings","availableFrom","minLeaseMonths","propertyAddress","/api/media/upload"])
 if(!ui.includes(m))throw new Error(`Missing Housing Inventory UI marker ${m}`);
const nav=fs.readFileSync("apps/partner/app/PartnerWorkspaceNav.tsx","utf8");if(!nav.includes("/housing-inventory")||!nav.includes("t.housing"))throw new Error("Housing Inventory navigation missing");
const nearby=fs.readFileSync("apps/customer/app/api/customer-nearby-services/route.ts","utf8");if(!nearby.includes('cache:"no-store"')||!nearby.includes('"cache-control":"no-store"'))throw new Error("Customer Housing sync path must remain no-store");
for(const bad of["Kho nhà/phòng · Housing","房源库存 · Housing inventory","Available · Còn trống"])if(ui.includes(bad))throw new Error(`Single-language violation ${bad}`);
console.log("Sprint 16.42 Platform Housing Listing Management & Partner Inventory Control structure is valid.");