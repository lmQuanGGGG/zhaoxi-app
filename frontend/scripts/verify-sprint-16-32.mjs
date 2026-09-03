import fs from"node:fs";
const req=[
 "SPRINT_16_31.md","SPRINT_16_32.md",
 "apps/admin/app/RestaurantOversightPanel.tsx",
 "apps/admin/app/page.tsx",
 "apps/admin/app/api/admin-restaurants/route.ts",
 "apps/admin/app/api/admin-restaurants/[id]/route.ts",
 "apps/customer/app/_components/ServiceBrowser.tsx",
 "apps/customer/app/_components/ServiceRequestForm.tsx",
 "apps/customer/app/_components/ServiceDetail.tsx",
 "apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx",
 "apps/partner/app/RestaurantOperationsPanel.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.32.0")throw new Error("Platform version must be 16.32.0");
for(const x of["verify:16.32","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const panel=fs.readFileSync("apps/admin/app/RestaurantOversightPanel.tsx","utf8");
for(const m of[
 "/api/admin-restaurants","platformPause","suspend","activate",
 "promotionDiscount","couponDiscount","deliverySubsidy",
 "topItems","campaignPerformance","window.confirm"
])if(!panel.includes(m))throw new Error(`Missing Admin Restaurant UI marker ${m}`);

const home=fs.readFileSync("apps/admin/app/page.tsx","utf8");
if(!home.includes("<RestaurantOversightPanel/>")||!home.includes('"restaurants","🍽️"'))throw new Error("Restaurants Admin tab missing");

for(const f of[
 "apps/customer/app/_components/ServiceBrowser.tsx",
 "apps/customer/app/_components/ServiceRequestForm.tsx",
 "apps/customer/app/_components/ServiceDetail.tsx",
 "apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx"
]){
 const text=fs.readFileSync(f,"utf8");if(!text.includes("platform_paused")||!text.includes("platformPaused"))throw new Error(`Customer platform pause UX missing in ${f}`);
}


const partnerOps=fs.readFileSync("apps/partner/app/RestaurantOperationsPanel.tsx","utf8");
if(!partnerOps.includes("platform_paused")||!partnerOps.includes("platformControl"))throw new Error("Partner platform pause notice missing");

for(const f of["apps/admin/app/RestaurantOversightPanel.tsx","apps/admin/app/page.tsx"]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Nhà hàng · Restaurant","餐厅 · Nhà hàng","Restaurants · 餐廳"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.32 Platform Admin Restaurant Control & Platform Oversight structure is valid.");