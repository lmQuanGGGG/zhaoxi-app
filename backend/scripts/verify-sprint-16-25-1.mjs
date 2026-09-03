import fs from "node:fs";
const req=[
 "SPRINT_16_25.md","SPRINT_16_25_1.md",".env.example",
 "lib/services/delivery-pricing-policy-service.ts",
 "lib/services/google-routes-service.ts",
 "lib/services/delivery-intelligence-service.ts",
 "app/api/delivery-pricing-policy/route.ts",
 "app/api/delivery/provider/route.ts",
 "app/api/service-requests/route.ts",
 "lib/order-timers.ts",
 "lib/services/driver-service.ts",
 "scripts/migrate-16-25-1.mjs"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.25.1 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.25.1")throw new Error("Backend version must be 16.25.1");
for(const x of["db:apply:16.25.1","verify:16.25.1","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const schema=fs.readFileSync("db/schema.ts","utf8");
for(const m of["deliveryPricingPolicies","baseFee","baseDistanceKm","perKmFee","partnerSubsidyAmount","subsidyWindows","distanceProvider"])
 if(!schema.includes(m))throw new Error(`Missing delivery policy schema marker ${m}`);

const google=fs.readFileSync("lib/services/google-routes-service.ts","utf8");
for(const m of["routes.googleapis.com/directions/v2:computeRoutes","X-Goog-Api-Key","routes.distanceMeters,routes.duration","GOOGLE_MAPS_ROUTES_API_KEY"])
 if(!google.includes(m))throw new Error(`Missing Google Routes marker ${m}`);

const intelligence=fs.readFileSync("lib/services/delivery-intelligence-service.ts","utf8");
for(const m of["Math.ceil(distance-policy.baseDistanceKm)","partnerSubsidyAmount","customerDeliveryFee","subsidyWindow","external_manual"])
 if(!intelligence.includes(m))throw new Error(`Missing pricing engine marker ${m}`);

const request=fs.readFileSync("app/api/service-requests/route.ts","utf8");
for(const m of["deliveryGrossFee","deliverySubsidy","deliveryCustomerFee","deliveryFulfillmentMode:\"external_manual\"","driverDispatchRequired:false","backend_policy_16.25.1"])
 if(!request.includes(m))throw new Error(`Missing authoritative order pricing marker ${m}`);

const timer=fs.readFileSync("lib/order-timers.ts","utf8");
if(!timer.includes("AUTO_COMPLETED_EXTERNAL_DELIVERY_PENDING")||!timer.includes("if(!external)await driverService.ensureReadyJobs()"))
 throw new Error("External orders must not enter internal Driver dispatch");

const driver=fs.readFileSync("lib/services/driver-service.ts","utf8");
if(!driver.includes('details.deliveryFulfillmentMode==="external_manual"')||!driver.includes("details.driverDispatchRequired===false"))
 throw new Error("Legacy Driver compatibility guard missing");

function quote(distance,insideWindow){
 const baseFee=15000,baseKm=2,perKm=8000,subsidyCap=20000;
 const gross=baseFee+Math.max(0,Math.ceil(distance-baseKm))*perKm;
 const subsidy=insideWindow?Math.min(gross,subsidyCap):0;
 return{gross,subsidy,customer:gross-subsidy};
}
const cases=[
 [1,true,15000,15000,0],
 [2,true,15000,15000,0],
 [3,true,23000,20000,3000],
 [5,true,39000,20000,19000],
 [5,false,39000,0,39000],
];
for(const[d,w,g,s,c] of cases){const q=quote(d,w);if(q.gross!==g||q.subsidy!==s||q.customer!==c)throw new Error(`Pricing contract failed at ${d}km`)}

if(!fs.readFileSync(".env.example","utf8").includes("GOOGLE_MAPS_ROUTES_API_KEY"))throw new Error("Missing Google Routes env example");
console.log("Sprint 16.25.1 Backend External Delivery Pricing Policy & Google Maps Distance structure is valid.");
