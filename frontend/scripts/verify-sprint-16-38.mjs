import fs from"node:fs";
const req=[
 "SPRINT_16_37.md","SPRINT_16_38.md",
 "apps/customer/app/_components/HousingBrowser.tsx",
 "apps/customer/app/housing/[id]/HousingListingDetail.tsx",
 "apps/customer/app/housing/requests/page.tsx",
 "apps/customer/app/housing/requests/HousingInquiryTracker.tsx",
 "apps/customer/app/api/customer-housing-inquiries/route.ts",
 "apps/partner/app/HousingLeadPipeline.tsx",
 "apps/partner/app/OperationsBoard.tsx",
 "apps/partner/app/StoreManager.tsx",
 "apps/partner/app/api/partner-housing-leads/route.ts",
 "apps/partner/app/api/partner-housing-leads/[id]/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.38.0")throw new Error("Platform version must be 16.38.0");
for(const x of["verify:16.38","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);

const browser=fs.readFileSync("apps/customer/app/_components/HousingBrowser.tsx","utf8");
for(const m of["minPrice","maxPrice","moveIn","availableOnly","priceAsc","priceDesc","/housing/requests","housingAvailabilityStatus"])
 if(!browser.includes(m))throw new Error(`Missing Housing search marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/housing/[id]/HousingListingDetail.tsx","utf8");
for(const m of["housingAvailabilityStatus","canInquire","statusReserved","statusRented","unavailableHint"])
 if(!detail.includes(m))throw new Error(`Missing Housing detail availability marker ${m}`);

const pipeline=fs.readFileSync("apps/partner/app/HousingLeadPipeline.tsx","utf8");
for(const m of['"new"|"contacted"|"viewing"|"negotiating"|"won"|"lost"',"partner-housing-leads","housingLeadStage"])
 if(!pipeline.includes(m))throw new Error(`Missing Housing lead pipeline marker ${m}`);

const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
for(const m of["housingAvailabilityStatus",'options:["available","reserved","rented"]',"localizedOption"])
 if(!store.includes(m))throw new Error(`Missing Housing availability control ${m}`);

const ops=fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8");
if(!ops.includes("<HousingLeadPipeline organizationId={orgId}/>"))throw new Error("Housing Lead Pipeline not mounted");

for(const f of[
 "apps/customer/app/_components/HousingBrowser.tsx",
 "apps/customer/app/housing/[id]/HousingListingDetail.tsx",
 "apps/customer/app/housing/requests/HousingInquiryTracker.tsx",
 "apps/partner/app/HousingLeadPipeline.tsx"
]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Còn trống · Available","可租 · Available","Yêu cầu mới · New"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.38 Platform Housing Search, Availability & Lead Management structure is valid.");