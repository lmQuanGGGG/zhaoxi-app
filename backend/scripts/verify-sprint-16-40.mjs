import fs from"node:fs";
const req=[
 "SPRINT_16_39.md","SPRINT_16_40.md",
 "lib/services/housing-messaging-service.ts",
 "lib/services/housing-appointment-reminder-service.ts",
 "app/api/customer-housing-inquiries/[id]/messages/route.ts",
 "app/api/partner-housing-leads/[id]/messages/route.ts",
 "app/api/housing-appointment-reminders/evaluate/route.ts",
 "app/api/notifications/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.40.0")throw new Error("Backend version must be 16.40.0");
for(const x of["verify:16.40","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const messaging=fs.readFileSync("lib/services/housing-messaging-service.ts","utf8");
for(const m of[
 "housingMessages","customerReadAt","partnerReadAt","housingFollowupHistory",
 "CUSTOMER_HOUSING_LEAD_FORBIDDEN","PARTNER_FORBIDDEN","HOUSING_MESSAGE_REQUIRED",
 "`HOUSING_MESSAGE:${senderRole}`"
])if(!messaging.includes(m))throw new Error(`Missing Housing messaging marker ${m}`);
if(messaging.includes("HOUSING_MESSAGE:${senderRole}:${body"))throw new Error("Private Housing message body leaks into status history");

const reminder=fs.readFileSync("lib/services/housing-appointment-reminder-service.ts","utf8");
for(const m of[
 "reminderSentAt","appointment_reminder","HOUSING_APPOINTMENT_REMINDER:","pg_advisory_xact_lock",
 'reminder>now','scheduled<=now'
])if(!reminder.includes(m))throw new Error(`Missing Housing reminder marker ${m}`);

const notifications=fs.readFileSync("app/api/notifications/route.ts","utf8");
for(const m of[
 "housingAppointmentReminderService.evaluate()","HOUSING_MESSAGE:",
 "HOUSING_APPOINTMENT_REMINDER:","uniqueMap"
])if(!notifications.includes(m))throw new Error(`Missing Housing notification marker ${m}`);

for(const route of["app/api/customer-housing-inquiries/[id]/messages/route.ts","app/api/partner-housing-leads/[id]/messages/route.ts"]){
 const x=fs.readFileSync(route,"utf8");
 if(!x.includes("housingMessagingService"))throw new Error(`Housing messaging route not connected: ${route}`);
}
console.log("Sprint 16.40 Backend Housing Messaging, Lead Timeline & Appointment Notifications structure is valid.");