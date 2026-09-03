import fs from"node:fs";
const req=[
 "SPRINT_16_36.md","SPRINT_16_37.md",
 "lib/services/housing-inquiry-service.ts",
 "app/api/housing-inquiries/route.ts",
 "app/api/service-requests/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.37.0")throw new Error("Backend version must be 16.37.0");
for(const x of["verify:16.37","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const s=fs.readFileSync("lib/services/housing-inquiry-service.ts","utf8");
for(const m of[
 'eq(modules.code,"housing")',"HOUSING_LISTING_UNAVAILABLE","inquiryType:\"rental_inquiry\"",
 "housingLead:true","paymentRequired:false","requestedMoveInDate","requestedLeaseMonths",
 "preferredContact","serviceRequestStatusHistory","HOUSING_INQUIRY_ASSIGNED_TO_PARTNER"
])if(!s.includes(m))throw new Error(`Missing Housing inquiry marker ${m}`);

const route=fs.readFileSync("app/api/housing-inquiries/route.ts","utf8");
if(!route.includes("housingInquiryService.create")||!route.includes("{status:201}"))throw new Error("Housing inquiry API contract missing");

console.log("Sprint 16.37 Backend Housing Listing Detail & Rental Inquiry structure is valid.");