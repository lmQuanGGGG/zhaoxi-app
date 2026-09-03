import fs from"node:fs";
const req=[
 "SPRINT_16_39.md","SPRINT_16_40.md",
 "apps/customer/app/housing/requests/HousingMessageThread.tsx",
 "apps/customer/app/housing/requests/HousingInquiryTracker.tsx",
 "apps/customer/app/CustomerOrderAlerts.tsx",
 "apps/customer/app/housing/[id]/HousingListingDetail.tsx",
 "apps/customer/app/api/customer-housing-inquiries/[id]/messages/route.ts",
 "apps/partner/app/HousingMessageThread.tsx",
 "apps/partner/app/HousingLeadPipeline.tsx",
 "apps/partner/app/HousingNotificationAlerts.tsx",
 "apps/partner/app/AppProviders.tsx",
 "apps/partner/app/api/partner-housing-leads/[id]/messages/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.40.0")throw new Error("Platform version must be 16.40.0");
for(const x of["verify:16.40","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const customer=fs.readFileSync("apps/customer/app/housing/requests/HousingMessageThread.tsx","utf8");
for(const m of["customerReadAt","partnerReadAt","unread","/messages",'method:"PATCH"','method:"POST"'])
 if(!customer.includes(m))throw new Error(`Missing Customer Housing message marker ${m}`);

const partner=fs.readFileSync("apps/partner/app/HousingMessageThread.tsx","utf8");
for(const m of["customerReadAt","partnerReadAt","organizationId","unread","/messages"])
 if(!partner.includes(m))throw new Error(`Missing Partner Housing message marker ${m}`);

const tracker=fs.readFileSync("apps/customer/app/housing/requests/HousingInquiryTracker.tsx","utf8");
if(!tracker.includes("<HousingMessageThread")||!tracker.includes("housingFollowupHistory"))throw new Error("Customer unified Housing timeline/message integration missing");

const pipeline=fs.readFileSync("apps/partner/app/HousingLeadPipeline.tsx","utf8");
if(!pipeline.includes("<HousingMessageThread")||!pipeline.includes("housingFollowupHistory"))throw new Error("Partner unified Housing timeline/message integration missing");

const alert=fs.readFileSync("apps/customer/app/CustomerOrderAlerts.tsx","utf8");
for(const m of["HOUSING_MESSAGE:","HOUSING_APPOINTMENT_REMINDER:","/housing/requests"])
 if(!alert.includes(m))throw new Error(`Customer global Housing alert marker missing ${m}`);

const partnerAlert=fs.readFileSync("apps/partner/app/HousingNotificationAlerts.tsx","utf8");
for(const m of["HOUSING_MESSAGE:customer","HOUSING_APPOINTMENT_REMINDER:","platform-notifications"])
 if(!partnerAlert.includes(m))throw new Error(`Partner global Housing alert marker missing ${m}`);

const listing=fs.readFileSync("apps/customer/app/housing/[id]/HousingListingDetail.tsx","utf8");
if(!listing.includes('localStorage.setItem("zhaoxi-request-codes"'))throw new Error("Housing inquiry request code not registered for Customer notifications");

for(const f of[
 "apps/customer/app/housing/requests/HousingMessageThread.tsx",
 "apps/customer/app/housing/requests/HousingInquiryTracker.tsx",
 "apps/partner/app/HousingMessageThread.tsx",
 "apps/partner/app/HousingNotificationAlerts.tsx"
]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Tin nhắn · Message","消息 · Message","Lịch xem nhà · Appointment"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.40 Platform Housing Messaging, Lead Timeline & Appointment Notifications structure is valid.");