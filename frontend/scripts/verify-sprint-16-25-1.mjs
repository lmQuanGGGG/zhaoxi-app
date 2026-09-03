import fs from "node:fs";
const req=[
 "SPRINT_16_25.md","SPRINT_16_25_1.md",
 "apps/admin/app/DeliveryPricingPanel.tsx",
 "apps/admin/app/api/delivery-pricing-policy/route.ts",
 "apps/admin/app/page.tsx",
 "apps/customer/app/_components/ServiceRequestForm.tsx",
 "apps/customer/app/order/[id]/page.tsx",
 "apps/customer/app/request.module.css"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.25.1 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.25.1")throw new Error("Platform version must be 16.25.1");
for(const x of["verify:16.25.1","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const admin=fs.readFileSync("apps/admin/app/DeliveryPricingPanel.tsx","utf8");
for(const m of["15000","baseDistanceKm","8000","partnerSubsidyAmount","subsidyWindows","Google Routes","/api/delivery-pricing-policy"])
 if(!admin.includes(m))throw new Error(`Missing Admin delivery pricing marker ${m}`);

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of["deliveryGrossFee","deliverySubsidy","deliveryCustomerFee","shippingGross","shippingSubsidy","backend_policy_16.25.1","external_manual"])
 if(!checkout.includes(m))throw new Error(`Missing checkout pricing disclosure marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/order/[id]/page.tsx","utf8");
for(const m of["deliveryGrossFee","deliverySubsidy","deliveryCustomerFee","externalPending","tracking&&!external"])
 if(!detail.includes(m))throw new Error(`Missing order detail external delivery marker ${m}`);

const forbidden=[
 "Phí giao hàng gốc ·","Nhà hàng trợ giá ·","配送费原价 · Phí","External delivery · Giao hàng"
];
for(const f of["apps/admin/app/DeliveryPricingPanel.tsx","apps/customer/app/_components/ServiceRequestForm.tsx","apps/customer/app/order/[id]/page.tsx"]){
 const text=fs.readFileSync(f,"utf8");for(const m of forbidden)if(text.includes(m))throw new Error(`Single-language violation in ${f}: ${m}`);
}
console.log("Sprint 16.25.1 Platform External Delivery Pricing Policy & Google Maps Distance structure is valid.");
