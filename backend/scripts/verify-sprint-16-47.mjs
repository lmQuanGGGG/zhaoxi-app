import fs from"node:fs";
const req=["SPRINT_16_46.md","SPRINT_16_47.md","lib/services/travel-inventory-service.ts","lib/services/travel-inquiry-service.ts","lib/services/travel-booking-service.ts","app/api/partner-travel-inventory/route.ts","app/api/partner-travel-inventory/[id]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.47.0")throw new Error("Backend version must be 16.47.0");
for(const x of["verify:16.47","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const inv=fs.readFileSync("lib/services/travel-inventory-service.ts","utf8");
for(const m of["travelPackages","blackoutDates","pricingMode","adultPrice","childPrice","groupPrice","surchargePerBooking","minGuests","maxGuests","travel_inventory"])
 if(!inv.includes(m))throw new Error(`Missing Travel inventory marker ${m}`);
const inquiry=fs.readFileSync("lib/services/travel-inquiry-service.ts","utf8");
for(const m of["packageId","quotedAmount","adults","children","TRAVEL_PACKAGE_MIN_GUESTS","TRAVEL_PACKAGE_MAX_GUESTS","TRAVEL_BLACKOUT_DATE"])
 if(!inquiry.includes(m))throw new Error(`Missing Travel pricing snapshot marker ${m}`);
const booking=fs.readFileSync("lib/services/travel-booking-service.ts","utf8");if(!booking.includes("blackoutDates"))throw new Error("Travel availability blackout handling missing");
console.log("Sprint 16.47 Backend Travel Partner Inventory, Pricing & Package Management structure is valid.");