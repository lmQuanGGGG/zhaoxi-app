import fs from "node:fs";
const checks={
 "lib/order-timers.ts":["AUTO_COMPLETED_FINDING_COURIER","finding_courier","estimatedCompletionAt"],
 "app/api/service-requests/[id]/status/route.ts":["estimatedMinutes","estimatedCompletionAt","deliveryStage"],
 "app/api/service-requests/route.ts":["completeExpiredOrders"],
 "app/api/notifications/route.ts":["completeExpiredOrders"]
};
for(const[file,patterns]of Object.entries(checks)){if(!fs.existsSync(file))throw new Error(`Missing ${file}`);const text=fs.readFileSync(file,"utf8");for(const p of patterns)if(!text.includes(p))throw new Error(`Missing ${p} in ${file}`)}
console.log("Sprint 13.7 backend automatic order completion structure is valid.");
