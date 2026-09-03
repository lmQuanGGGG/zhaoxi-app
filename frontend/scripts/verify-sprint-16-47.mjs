import fs from"node:fs";
const req=["SPRINT_16_46.md","SPRINT_16_47.md","apps/partner/app/travel-inventory/page.tsx","apps/partner/app/travel-inventory/TravelInventoryManager.tsx","apps/partner/app/PartnerWorkspaceNav.tsx","apps/partner/app/api/partner-travel-inventory/route.ts","apps/partner/app/api/partner-travel-inventory/[id]/route.ts","apps/customer/app/travel/[id]/TravelExperienceDetail.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.47.0")throw new Error("Platform version must be 16.47.0");
for(const x of["verify:16.47","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const inv=fs.readFileSync("apps/partner/app/travel-inventory/TravelInventoryManager.tsx","utf8");
for(const m of["travel-inventory","pricingMode","adultPrice","childPrice","groupPrice","surchargePerBooking","blackoutDates","packages"])
 if(!inv.includes(m))throw new Error(`Missing Travel Inventory UI marker ${m}`);
const nav=fs.readFileSync("apps/partner/app/PartnerWorkspaceNav.tsx","utf8");if(!nav.includes("/travel-inventory")||!nav.includes("t.travel"))throw new Error("Travel Inventory navigation missing");
const detail=fs.readFileSync("apps/customer/app/travel/[id]/TravelExperienceDetail.tsx","utf8");
for(const m of["travelPackages","packageId","adultCount","childCount","quoted","selected?.id"])
 if(!detail.includes(m))throw new Error(`Missing Customer package selection marker ${m}`);
console.log("Sprint 16.47 Platform Travel Partner Inventory, Pricing & Package Management structure is valid.");