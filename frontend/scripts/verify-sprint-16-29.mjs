import fs from"node:fs";
const req=[
"SPRINT_16_28.md","SPRINT_16_29.md",
"apps/partner/app/FoodCommercialEditor.tsx",
"apps/partner/app/StoreManager.tsx",
"apps/partner/app/api/partner-food-commercial/[id]/route.ts",
"apps/customer/app/api/food-pricing/route.ts",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx",
"apps/customer/app/_components/ServiceDetail.tsx",
"apps/customer/app/_components/ServiceRequestForm.tsx",
"apps/customer/app/order/[id]/page.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.29.0")throw new Error("Platform version must be 16.29.0");
for(const x of["verify:16.29","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);

const editor=fs.readFileSync("apps/partner/app/FoodCommercialEditor.tsx","utf8");
for(const m of['value="percent"','value="fixed"','value="bundle"',"saleSchedule","weekdays","minQty","/api/partner-food-commercial/"])
 if(!editor.includes(m))throw new Error(`Missing Partner commercial editor marker ${m}`);

const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
if(!store.includes("<FoodCommercialEditor"))throw new Error("Food Commercial editor not mounted");

const browser=fs.readFileSync("apps/customer/app/_components/ServiceBrowser.tsx","utf8");
for(const m of["foodPricing","/api/food-pricing?","promotionLabel","scheduledAvailable","lineSubtotal"])
 if(!browser.includes(m))throw new Error(`Missing Food Browser promotion marker ${m}`);

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of["itemBaseSubtotal","itemDiscount","foodScheduleBlocked","customer_preview_16.29","scheduledOff"])
 if(!checkout.includes(m))throw new Error(`Missing Checkout commercial marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/order/[id]/page.tsx","utf8");
for(const m of["itemBaseSubtotal","itemDiscount","itemPay"])
 if(!detail.includes(m))throw new Error(`Missing Order Detail promotion accounting marker ${m}`);

const singleLanguageFiles=[
 "apps/partner/app/FoodCommercialEditor.tsx",
 "apps/customer/app/_components/ServiceRequestForm.tsx",
 "apps/customer/app/_components/ServiceBrowser.tsx"
];
for(const f of singleLanguageFiles){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Ưu đãi · Promotion","促销 · Promotion","优惠 · Ưu đãi"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.29 Platform Restaurant Promotions, Menu Scheduling & Discount Engine structure is valid.");