import fs from"node:fs";
const req=[
 "SPRINT_16_38.md","SPRINT_16_39.md",
 "apps/customer/app/housing/requests/HousingInquiryTracker.tsx",
 "apps/customer/app/api/customer-housing-inquiries/[id]/appointment/route.ts",
 "apps/partner/app/HousingLeadPipeline.tsx",
 "apps/partner/app/api/partner-housing-leads/[id]/appointment/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.39.0")throw new Error("Platform version must be 16.39.0");
for(const x of["verify:16.39","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const customer=fs.readFileSync("apps/customer/app/housing/requests/HousingInquiryTracker.tsx","utf8");
for(const m of["housingAppointment","housingFollowupHistory",'appointment(r.id,"propose"','appointment(r.id,"confirm"','appointment(r.id,"cancel"',"reminderAt"])
 if(!customer.includes(m))throw new Error(`Missing Customer appointment marker ${m}`);

const partner=fs.readFileSync("apps/partner/app/HousingLeadPipeline.tsx","utf8");
for(const m of["housingAppointment","housingFollowupHistory",'appointment(r,"confirm"','appointment(r,"reschedule"','appointment(r,"complete"','appointment(r,"cancel"',"reminderAt"])
 if(!partner.includes(m))throw new Error(`Missing Partner appointment marker ${m}`);

for(const f of["apps/customer/app/housing/requests/HousingInquiryTracker.tsx","apps/partner/app/HousingLeadPipeline.tsx"]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Lịch xem nhà · Viewing","看房预约 · Appointment","Đã xác nhận · Confirmed"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.39 Platform Housing Viewing Appointment & Partner–Customer Follow-up structure is valid.");