import { access } from "node:fs/promises";
const files=["migrations/0004_driver_delivery_core.sql","lib/services/driver-service.ts","app/api/driver/profile/route.ts","app/api/driver/jobs/route.ts","app/api/driver/jobs/[id]/accept/route.ts","app/api/driver/jobs/[id]/status/route.ts","app/api/driver/location/route.ts","app/api/delivery/[requestId]/route.ts"];
for(const file of files)await access(new URL(`../${file}`,import.meta.url));
console.log("Sprint 14.3 backend Driver & Delivery Core structure is valid.");
