import fs from"node:fs";
const req=["SPRINT_16_47.md","SPRINT_16_48.md","apps/admin/app/TravelOversightPanel.tsx","apps/admin/app/page.tsx","apps/admin/app/api/admin-travel/route.ts","apps/admin/app/api/admin-travel/experiences/[id]/route.ts","apps/admin/app/api/admin-travel/experiences/[id]/packages/[packageId]/route.ts","apps/partner/app/travel-inventory/TravelInventoryManager.tsx","apps/customer/app/du-lich/TravelBrowser.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.48.0")throw new Error("Platform version must be 16.48.0");
for(const x of["verify:16.48","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const admin=fs.readFileSync("apps/admin/app/TravelOversightPanel.tsx","utf8");
for(const m of["bookingConversionRate","completionRate","quotedValue","confirmedValue","completedValue","pkgAct","admin-travel"])
 if(!admin.includes(m))throw new Error(`Missing Admin Travel UI marker ${m}`);
const page=fs.readFileSync("apps/admin/app/page.tsx","utf8");if(!page.includes('["travel","✈️",t.travel]')||!page.includes("<TravelOversightPanel/>"))throw new Error("Admin Travel tab missing");
const partner=fs.readFileSync("apps/partner/app/travel-inventory/TravelInventoryManager.tsx","utf8");if(!partner.includes("travelAdminVerified")||!partner.includes("travelAdminHidden"))throw new Error("Partner Travel moderation state missing");
const customer=fs.readFileSync("apps/customer/app/du-lich/TravelBrowser.tsx","utf8");if(!customer.includes("travelAdminVerified")||!customer.includes("t.verified"))throw new Error("Customer Travel Verified signal missing");
for(const f of["apps/admin/app/TravelOversightPanel.tsx","apps/partner/app/travel-inventory/TravelInventoryManager.tsx","apps/customer/app/du-lich/TravelBrowser.tsx"]){const x=fs.readFileSync(f,"utf8");for(const bad of["Travel · Du lịch","旅游 · Travel","Xác thực · Verified"])if(x.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`)}
console.log("Sprint 16.48 Platform Travel Admin Oversight, Package Moderation & Commercial Analytics structure is valid.");