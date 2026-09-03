import fs from"node:fs";
const req=[
"SPRINT_16_27.md","SPRINT_16_28.md",
"lib/services/restaurant-availability-service.ts",
"app/api/partner-restaurant-operations/route.ts",
"app/api/restaurant-status/route.ts",
"app/api/restaurant-status/[id]/route.ts",
"app/api/service-requests/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.28.0")throw new Error("Backend version must be 16.28.0");
for(const x of["verify:16.28","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);

const s=fs.readFileSync("lib/services/restaurant-availability-service.ts","utf8");
for(const m of["businessHoursEnabled","manualPaused","maxActiveKitchenOrders","autoPauseWhenCapacity","withinWeeklyHours","activeKitchenCount","Asia/Ho_Chi_Minh","PARTNER_FORBIDDEN"])
 if(!s.includes(m))throw new Error(`Missing restaurant availability marker ${m}`);

const order=fs.readFileSync("app/api/service-requests/route.ts","utf8");
for(const m of["restaurantAvailabilityService.status","RESTAURANT_PAUSED","RESTAURANT_CLOSED","RESTAURANT_AT_CAPACITY"])
 if(!order.includes(m))throw new Error(`Missing food order availability guard ${m}`);

const publicStatus=fs.readFileSync("app/api/restaurant-status/route.ts","utf8");
if(!publicStatus.includes("ids.join")&& !publicStatus.includes('split(",")'))throw new Error("Batch restaurant status endpoint missing");

console.log("Sprint 16.28 Backend Restaurant Business Hours, Auto Pause & Order Capacity Control structure is valid.");