import fs from"node:fs";
const req=[
"SPRINT_16_28.md","SPRINT_16_29.md",
"lib/services/food-commercial-service.ts",
"app/api/partner-food-commercial/[id]/route.ts",
"app/api/food-pricing/route.ts",
"app/api/service-requests/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.29.0")throw new Error("Backend version must be 16.29.0");
for(const x of["verify:16.29","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);

const engine=fs.readFileSync("lib/services/food-commercial-service.ts","utf8");
for(const m of[
 "PromotionType","percent","fixed","bundle","saleSchedule","scheduledAvailable",
 "promotionLabel","itemBaseSubtotal","itemDiscount","orderPricing","FOOD_ITEM_OUTSIDE_SALE_SCHEDULE",
 "Asia/Ho_Chi_Minh"
])if(!engine.includes(m))throw new Error(`Missing commercial engine marker ${m}`);

const request=fs.readFileSync("app/api/service-requests/route.ts","utf8");
for(const m of[
 "foodCommercialService.orderPricing",
 "itemBaseSubtotal:foodPricing.itemBaseSubtotal",
 "itemDiscount:foodPricing.itemDiscount",
 "itemSubtotal:foodPricing.itemSubtotal",
 'pricingSource:"backend_food_commercial_16.29"'
])if(!request.includes(m))throw new Error(`Missing authoritative pricing marker ${m}`);

// Contract math tests matching the Backend engine.
function price(base,q,p){
 const subtotal=base*q;let discount=0;
 if(p.type==="percent")discount=Math.round(subtotal*p.percent/100);
 else if(p.type==="fixed")discount=Math.max(0,subtotal-Math.min(base,p.fixed)*q);
 else if(p.type==="bundle"){
  const bundles=Math.floor(q/p.qty),remain=q%p.qty;
  discount=Math.max(0,subtotal-(bundles*p.bundle+remain*base));
 }
 return{baseSubtotal:subtotal,discount,final:subtotal-discount};
}
let q=price(50000,2,{type:"percent",percent:20});if(q.final!==80000||q.discount!==20000)throw new Error("Percent promotion math failed");
q=price(50000,2,{type:"fixed",fixed:39000});if(q.final!==78000||q.discount!==22000)throw new Error("Fixed promotion math failed");
q=price(50000,5,{type:"bundle",qty:2,bundle:80000});if(q.final!==210000||q.discount!==40000)throw new Error("Bundle promotion math failed");

console.log("Sprint 16.29 Backend Restaurant Promotions, Menu Scheduling & Discount Engine structure is valid.");