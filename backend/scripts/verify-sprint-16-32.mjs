import fs from"node:fs";
const req=[
 "SPRINT_16_31.md","SPRINT_16_32.md",
 "lib/services/admin-restaurant-oversight-service.ts",
 "lib/services/restaurant-analytics-service.ts",
 "lib/services/restaurant-availability-service.ts",
 "app/api/admin-restaurants/route.ts",
 "app/api/admin-restaurants/[id]/route.ts",
 "app/api/service-requests/route.ts",
 "app/api/restaurant-status/route.ts",
 "app/api/restaurant-status/[id]/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.32.0")throw new Error("Backend version must be 16.32.0");
for(const x of["verify:16.32","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const oversight=fs.readFileSync("lib/services/admin-restaurant-oversight-service.ts","utf8");
for(const m of[
 "modules.code","restaurantAnalyticsService.overviewForOrganization",
 "platformRestaurantControl","action===\"pause\"","action===\"resume\"",
 "action===\"suspend\"","action===\"activate\"",
 "operationsAuditLogs","restaurant_oversight","promotionDiscount","couponDiscount","deliverySubsidy"
])if(!oversight.includes(m))throw new Error(`Missing oversight marker ${m}`);

const availability=fs.readFileSync("lib/services/restaurant-availability-service.ts","utf8");
for(const m of["platform_paused","platformRestaurantControl","platformControl:{paused:platformPaused"])
 if(!availability.includes(m))throw new Error(`Missing platform pause marker ${m}`);

const requests=fs.readFileSync("app/api/service-requests/route.ts","utf8");
if(!requests.includes("RESTAURANT_PLATFORM_PAUSED"))throw new Error("Platform pause is not enforced during order creation");

const analytics=fs.readFileSync("lib/services/restaurant-analytics-service.ts","utf8");
if(!analytics.includes("overviewForOrganization"))throw new Error("Admin analytics aggregation hook missing");

for(const route of["app/api/admin-restaurants/route.ts","app/api/admin-restaurants/[id]/route.ts"]){
 const text=fs.readFileSync(route,"utf8");if(!text.includes('role!=="admin"')||!text.includes("ADMIN_REQUIRED"))throw new Error(`Admin authorization missing in ${route}`);
}
console.log("Sprint 16.32 Backend Admin Restaurant Control & Platform Oversight structure is valid.");