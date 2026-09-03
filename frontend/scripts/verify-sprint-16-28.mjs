import fs from"node:fs";
const req=[
"SPRINT_16_27.md","SPRINT_16_28.md",
"apps/partner/app/RestaurantOperationsPanel.tsx",
"apps/partner/app/StoreManager.tsx",
"apps/partner/app/api/partner-restaurant-operations/route.ts",
"apps/customer/app/api/restaurant-status/route.ts",
"apps/customer/app/api/restaurant-status/[id]/route.ts",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/customer/app/_components/ServiceDetail.tsx",
"apps/customer/app/_components/ServiceRequestForm.tsx",
"apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.28.0")throw new Error("Platform version must be 16.28.0");
for(const x of["verify:16.28","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);

const partner=fs.readFileSync("apps/partner/app/RestaurantOperationsPanel.tsx","utf8");
for(const m of["businessHoursEnabled","manualPaused","maxActiveKitchenOrders","autoPauseWhenCapacity","weeklyHours","load(false)"])
 if(!partner.includes(m))throw new Error(`Missing Partner operations control ${m}`);

const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
if(!store.includes("<RestaurantOperationsPanel organizationId={orgId}/>"))throw new Error("Restaurant Operations panel not mounted");

const browser=fs.readFileSync("apps/customer/app/_components/ServiceBrowser.tsx","utf8");
for(const m of["restaurantStatuses","/api/restaurant-status?ids=","restaurantOpen","at_capacity"])
 if(!browser.includes(m))throw new Error(`Missing Customer restaurant availability marker ${m}`);

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of["restaurantStatus","restaurantPaused","restaurantClosed","restaurantBusy","restaurantStatus?.open===false"])
 if(!checkout.includes(m))throw new Error(`Missing checkout availability marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx","utf8");
if(!detail.includes("restaurantOpen")||!detail.includes("/api/restaurant-status/"))throw new Error("Restaurant detail status missing");

console.log("Sprint 16.28 Platform Restaurant Business Hours, Auto Pause & Order Capacity Control structure is valid.");