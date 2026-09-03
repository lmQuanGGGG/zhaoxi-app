import fs from"node:fs";
const req=[
 "SPRINT_16_37.md","SPRINT_16_38.md",
 "lib/services/housing-inquiry-service.ts",
 "lib/services/housing-lead-service.ts",
 "app/api/housing-inquiries/route.ts",
 "app/api/partner-housing-leads/route.ts",
 "app/api/partner-housing-leads/[id]/route.ts",
 "app/api/customer-housing-inquiries/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.38.0")throw new Error("Backend version must be 16.38.0");
for(const x of["verify:16.38","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const inquiry=fs.readFileSync("lib/services/housing-inquiry-service.ts","utf8");
for(const m of[
 "housingAvailabilityStatus","HOUSING_LISTING_RESERVED","HOUSING_MOVE_IN_BEFORE_AVAILABLE",
 'housingLeadStage:"new"','source:"housing_listing_detail_16.38"'
])if(!inquiry.includes(m))throw new Error(`Missing Housing availability guard ${m}`);

const leads=fs.readFileSync("lib/services/housing-lead-service.ts","utf8");
for(const m of[
 '"new"|"contacted"|"viewing"|"negotiating"|"won"|"lost"',
 "PARTNER_FORBIDDEN","housingLeadStage","HOUSING_LEAD_STAGE:",
 "listCustomer","eq(serviceRequests.customerId,userId)"
])if(!leads.includes(m))throw new Error(`Missing Housing lead marker ${m}`);

for(const f of["app/api/partner-housing-leads/route.ts","app/api/partner-housing-leads/[id]/route.ts"]){
 const x=fs.readFileSync(f,"utf8");if(!x.includes('role!=="partner"'))throw new Error(`Partner auth missing: ${f}`);
}
const customer=fs.readFileSync("app/api/customer-housing-inquiries/route.ts","utf8");
if(!customer.includes('role!=="customer"')||!customer.includes("CUSTOMER_REQUIRED"))throw new Error("Customer Housing inquiry authorization missing");

console.log("Sprint 16.38 Backend Housing Search, Availability & Lead Management structure is valid.");