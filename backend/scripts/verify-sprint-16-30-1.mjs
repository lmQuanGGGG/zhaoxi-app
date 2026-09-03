import fs from "node:fs";
const req=[
 "SPRINT_16_30.md","SPRINT_16_30_1.md",
 "app/api/partner-coupons/route.ts",
 "lib/services/restaurant-coupon-service.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.30.1")throw new Error("Backend version must be 16.30.1");
for(const x of["verify:16.30.1","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const route=fs.readFileSync("app/api/partner-coupons/route.ts","utf8");
if(route.includes("body),201)"))throw new Error("Invalid success(data,201) call remains");
if(!route.includes("body),{status:201})"))throw new Error("ResponseInit status hotfix missing");

const svc=fs.readFileSync("lib/services/restaurant-coupon-service.ts","utf8");
if(svc.includes("discountType:row?.discountType||null"))throw new Error("Unsafe discountType assignment remains");
if(!svc.includes('row?.discountType==="percent"||row?.discountType==="fixed"'))throw new Error("discountType union narrowing missing");

console.log("Sprint 16.30.1 Backend TypeScript hotfix structure is valid.");