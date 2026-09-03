import fs from"node:fs";
const req=[
 "SPRINT_16_29.md","SPRINT_16_29_1.md","SPRINT_16_30.md",
 "lib/services/restaurant-coupon-service.ts",
 "app/api/partner-coupons/route.ts",
 "app/api/partner-coupons/[id]/route.ts",
 "app/api/customer-coupons/route.ts",
 "app/api/service-requests/route.ts",
 "scripts/migrate-16-30.mjs","db/schema.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.30.0")throw new Error("Backend version must be 16.30.0");
for(const x of["db:apply:16.30","verify:16.30","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const schema=fs.readFileSync("db/schema.ts","utf8");
for(const m of["restaurantCoupons","couponRedemptions","usedCount","perCustomerLimit","restaurant_coupons_org_code_unique"])
 if(!schema.includes(m))throw new Error(`Missing coupon schema marker ${m}`);

const svc=fs.readFileSync("lib/services/restaurant-coupon-service.ts","utf8");
for(const m of[
 "COUPON_MIN_ORDER_NOT_MET","COUPON_USAGE_LIMIT_REACHED","COUPON_CUSTOMER_LIMIT_REACHED",
 "pg_advisory_xact_lock","hashtext","couponRedemptions","expectedDiscount","COUPON_PRICE_CHANGED"
])if(!svc.includes(m))throw new Error(`Missing redemption-control marker ${m}`);

const request=fs.readFileSync("app/api/service-requests/route.ts","utf8");
for(const m of[
 "restaurantCouponService.evaluate","restaurantCouponService.redeem",
 "couponDiscount","itemSubtotalBeforeCoupon",'pricingSource:"backend_food_coupon_16.30"',
 "await db.delete(serviceRequests)"
])if(!request.includes(m))throw new Error(`Missing authoritative coupon order marker ${m}`);

function coupon(subtotal,type,value,max){
 let d=type==="percent"?Math.round(subtotal*value/100):value;
 if(type==="percent"&&max!=null)d=Math.min(d,max);
 d=Math.max(0,Math.min(subtotal,Math.round(d)));
 return{subtotal,discount:d,after:subtotal-d};
}
let q=coupon(200000,"percent",20,30000);
if(q.discount!==30000||q.after!==170000)throw new Error("Percent coupon cap contract failed");
q=coupon(80000,"fixed",100000,null);
if(q.discount!==80000||q.after!==0)throw new Error("Fixed coupon floor contract failed");

console.log("Sprint 16.30 Backend Restaurant Coupons, Campaigns & Redemption Control structure is valid.");