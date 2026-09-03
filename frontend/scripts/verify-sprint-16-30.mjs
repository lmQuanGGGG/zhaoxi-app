import fs from"node:fs";
const req=[
 "SPRINT_16_29.md","SPRINT_16_30.md",
 "apps/partner/app/CouponManager.tsx",
 "apps/partner/app/StoreManager.tsx",
 "apps/partner/app/api/partner-coupons/route.ts",
 "apps/partner/app/api/partner-coupons/[id]/route.ts",
 "apps/customer/app/api/customer-coupons/route.ts",
 "apps/customer/app/_components/ServiceRequestForm.tsx",
 "apps/customer/app/order/[id]/page.tsx",
 "apps/partner/app/OperationsBoard.tsx",
 "apps/customer/app/request.module.css"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.30.0")throw new Error("Platform version must be 16.30.0");
for(const x of["verify:16.30","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const partner=fs.readFileSync("apps/partner/app/CouponManager.tsx","utf8");
for(const m of["discountType","totalUsageLimit","perCustomerLimit","minOrderAmount","datetime-local","/api/partner-coupons"])
 if(!partner.includes(m))throw new Error(`Missing Partner coupon marker ${m}`);
const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
if(!store.includes("<CouponManager organizationId={orgId}/>"))throw new Error("Coupon Manager not mounted");

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of["availableCoupons","couponEvaluation","applyCoupon","couponDiscount","itemSubtotalAfterCoupon",'pricingSource:"customer_preview_16.30"'])
 if(!checkout.includes(m))throw new Error(`Missing checkout coupon marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/order/[id]/page.tsx","utf8");
if(!detail.includes("details.couponDiscount")||!detail.includes("details.couponCode"))throw new Error("Order coupon accounting missing");

for(const f of["apps/partner/app/CouponManager.tsx","apps/customer/app/_components/ServiceRequestForm.tsx"]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Coupon · 优惠券","优惠券 · Coupon","Coupon · 優惠券"])if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.30 Platform Restaurant Coupons, Campaigns & Redemption Control structure is valid.");