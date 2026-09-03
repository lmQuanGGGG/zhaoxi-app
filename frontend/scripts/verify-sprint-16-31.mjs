import fs from"node:fs";
const req=[
 "SPRINT_16_30.md","SPRINT_16_31.md",
 "apps/partner/app/RestaurantAnalyticsDashboard.tsx",
 "apps/partner/app/analytics/page.tsx",
 "apps/partner/app/PartnerWorkspaceNav.tsx",
 "apps/partner/app/api/partner-restaurant-analytics/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.31.0")throw new Error("Platform version must be 16.31.0");
for(const x of["verify:16.31","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const d=fs.readFileSync("apps/partner/app/RestaurantAnalyticsDashboard.tsx","utf8");
for(const m of[
 "7|30|90","averageOrderValue","itemPromotionDiscount","couponDiscount","deliverySubsidy",
 "averagePreparationMinutes","topItems","campaignPerformance","/api/partner-restaurant-analytics"
])if(!d.includes(m))throw new Error(`Missing dashboard marker ${m}`);

const nav=fs.readFileSync("apps/partner/app/PartnerWorkspaceNav.tsx","utf8");
if(!nav.includes('href="/analytics"')||!nav.includes("analytics"))throw new Error("Partner Analytics navigation missing");

for(const f of["apps/partner/app/RestaurantAnalyticsDashboard.tsx","apps/partner/app/PartnerWorkspaceNav.tsx"]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Doanh thu · Revenue","优惠券 · Coupon","Coupon · 優惠券"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.31 Platform Restaurant Analytics, Revenue & Promotion Performance structure is valid.");