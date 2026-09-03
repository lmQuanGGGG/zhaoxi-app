import fs from"node:fs";
const req=[
 "SPRINT_16_38.md","SPRINT_16_39.md",
 "lib/services/housing-lead-service.ts",
 "lib/services/housing-appointment-service.ts",
 "app/api/customer-housing-inquiries/[id]/appointment/route.ts",
 "app/api/partner-housing-leads/[id]/appointment/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.39.0")throw new Error("Backend version must be 16.39.0");
for(const x of["verify:16.39","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const s=fs.readFileSync("lib/services/housing-appointment-service.ts","utf8");
for(const m of[
 '"proposed"|"confirmed"|"completed"|"cancelled"',
 "HOUSING_APPOINTMENT_TIME_PAST","CUSTOMER_HOUSING_LEAD_FORBIDDEN","PARTNER_FORBIDDEN",
 "housingFollowupHistory","housingAppointment","reminderAt","HOUSING_FOLLOWUP:",
 'proposedBy:"customer"','proposedBy:"partner"'
])if(!s.includes(m))throw new Error(`Missing Housing appointment marker ${m}`);

const c=fs.readFileSync("app/api/customer-housing-inquiries/[id]/appointment/route.ts","utf8");
if(!c.includes('role!=="customer"')||!c.includes("housingAppointmentService.customerAction"))throw new Error("Customer appointment authorization missing");
const p=fs.readFileSync("app/api/partner-housing-leads/[id]/appointment/route.ts","utf8");
if(!p.includes('role!=="partner"')||!p.includes("housingAppointmentService.partnerAction"))throw new Error("Partner appointment authorization missing");

console.log("Sprint 16.39 Backend Housing Viewing Appointment & Partner–Customer Follow-up structure is valid.");