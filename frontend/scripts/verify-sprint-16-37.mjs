import fs from"node:fs";
const req=[
 "SPRINT_16_36.md","SPRINT_16_37.md",
 "apps/customer/app/_components/HousingBrowser.tsx",
 "apps/customer/app/housing/[id]/page.tsx",
 "apps/customer/app/housing/[id]/HousingListingDetail.tsx",
 "apps/customer/app/api/housing-inquiries/route.ts",
 "apps/partner/app/StoreManager.tsx",
 "apps/partner/app/OperationsBoard.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.37.0")throw new Error("Platform version must be 16.37.0");
for(const x of["verify:16.37","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const detail=fs.readFileSync("apps/customer/app/housing/[id]/HousingListingDetail.tsx","utf8");
for(const m of[
 "galleryUrls","scrollSnapType","amenities","availableFrom","minLeaseMonths",
 "maps.google.com","customer-favorites","/api/housing-inquiries","moveInDate",
 "leaseMonths","preferredContact"
])if(!detail.includes(m))throw new Error(`Missing Housing detail marker ${m}`);

const browser=fs.readFileSync("apps/customer/app/_components/HousingBrowser.tsx","utf8");
if(!browser.includes('href={`/housing/${x.id}`}'))throw new Error("Housing Browser does not route to dedicated detail");

const store=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
for(const m of["availableFrom","minLeaseMonths","amenities","propertyAddress","latitude","longitude","galleryUrls","appendHousingGallery"])
 if(!store.includes(m))throw new Error(`Missing Partner Housing marker ${m}`);

const ops=fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8");
for(const m of['r.moduleCode==="housing"','inquiryType==="rental_inquiry"',"requestedMoveInDate","requestedLeaseMonths","housingAccept","housingComplete"])
 if(!ops.includes(m))throw new Error(`Missing Partner Housing lead marker ${m}`);

for(const f of["apps/customer/app/housing/[id]/HousingListingDetail.tsx","apps/partner/app/OperationsBoard.tsx"]){
 const text=fs.readFileSync(f,"utf8");
 for(const bad of["Thuê nhà · Housing","租房 · Thuê nhà","Rental inquiry · 租房意向"])
  if(text.includes(bad))throw new Error(`Single-language violation ${f}: ${bad}`);
}
console.log("Sprint 16.37 Platform Housing Listing Detail & Rental Inquiry structure is valid.");