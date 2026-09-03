import fs from"node:fs";
const req=[
 "SPRINT_16_30.md","SPRINT_16_30_1.md","SPRINT_16_31.md",
 "lib/services/restaurant-analytics-service.ts",
 "app/api/partner-restaurant-analytics/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.31.0")throw new Error("Backend version must be 16.31.0");
for(const x of["verify:16.31","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const s=fs.readFileSync("lib/services/restaurant-analytics-service.ts","utf8");
for(const m of[
 "PARTNER_FORBIDDEN","deliveryFulfillmentMode","itemBaseRevenue","itemPromotionDiscount","couponDiscount",
 "foodRevenue","deliverySubsidy","averageOrderValue","averagePreparationMinutes","topItems",
 "campaignPerformance","couponRedemptions","restaurantCoupons","completionRate","cancellationRate"
])if(!s.includes(m))throw new Error(`Missing analytics marker ${m}`);

const route=fs.readFileSync("app/api/partner-restaurant-analytics/route.ts","utf8");
for(const m of["PARTNER_REQUIRED","organizationId","days","restaurantAnalyticsService.overview"])
 if(!route.includes(m))throw new Error(`Missing analytics route marker ${m}`);

console.log("Sprint 16.31 Backend Restaurant Analytics, Revenue & Promotion Performance structure is valid.");