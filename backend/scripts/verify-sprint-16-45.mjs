import fs from"node:fs";
const req=["SPRINT_16_44.md","SPRINT_16_45.md","lib/services/travel-inquiry-service.ts","lib/services/travel-booking-service.ts","app/api/travel-availability/route.ts","app/api/customer-travel-inquiries/route.ts","app/api/customer-travel-inquiries/[id]/route.ts","app/api/partner-travel-leads/route.ts","app/api/partner-travel-leads/[id]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.45.0")throw new Error("Backend version must be 16.45.0");
for(const x of["verify:16.45","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const booking=fs.readFileSync("lib/services/travel-booking-service.ts","utf8");
for(const m of["remainingGuests","travelBookingStage","pg_advisory_xact_lock","TRAVEL_SLOT_CAPACITY_EXCEEDED","partnerList","customerList","customerCancel","requested","confirmed","completed","cancelled","rejected"])
 if(!booking.includes(m))throw new Error(`Missing Travel booking marker ${m}`);
const inquiry=fs.readFileSync("lib/services/travel-inquiry-service.ts","utf8");
for(const m of["requestedTime","travelBookingStage","TRAVEL_DATE_UNAVAILABLE","TRAVEL_TIME_UNAVAILABLE","TRAVEL_BOOKING_NOTICE_TOO_SHORT"])
 if(!inquiry.includes(m))throw new Error(`Missing Travel inquiry scheduling marker ${m}`);
console.log("Sprint 16.45 Backend Travel Availability, Schedule & Booking Lead Management structure is valid.");