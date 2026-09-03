import fs from"node:fs";
const req=[
"SPRINT_16_22.md","SPRINT_16_23.md",
"apps/customer/app/_lib/customer-location.ts",
"apps/customer/app/_components/CustomerLocationBar.tsx",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/customer/app/_components/ServiceRequestForm.tsx",
"apps/customer/app/profile/page.tsx",
"apps/customer/app/search/page.tsx",
"apps/customer/app/api/customer-nearby-services/route.ts",
"apps/customer/app/api/customer-location-context/route.ts",
"apps/customer/app/api/customer-search/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.23 file: ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.23.0")throw new Error("Platform version must be 16.23.0");
for(const x of["verify:16.23","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);

const loc=fs.readFileSync("apps/customer/app/_lib/customer-location.ts","utf8");
for(const m of["sessionStorage","CUSTOMER_LOCATION_EVENT","readSessionPoint","writeSessionPoint"])if(!loc.includes(m))throw new Error(`Missing session-location marker ${m}`);
if(loc.includes("localStorage"))throw new Error("Current GPS must not be persisted in localStorage");

const browser=fs.readFileSync("apps/customer/app/_components/ServiceBrowser.tsx","utf8");
for(const m of["/api/customer-nearby-services","distanceKm","CustomerLocationBar","subscribeSessionPoint"])if(!browser.includes(m))throw new Error(`Missing nearby browser marker ${m}`);

const search=fs.readFileSync("apps/customer/app/search/page.tsx","utf8");
for(const m of['params.set("lat"','params.set("lng"',"distanceKm","CustomerLocationBar"])if(!search.includes(m))throw new Error(`Missing location-aware search marker ${m}`);
const proxy=fs.readFileSync("apps/customer/app/api/customer-search/route.ts","utf8");
if(!proxy.includes('"lat","lng"'))throw new Error("Search proxy must forward lat/lng");

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of["savedAddresses","chooseAddress","savedAddressBox","address.latitude"])if(!checkout.includes(m))throw new Error(`Missing saved-address checkout marker ${m}`);

const profile=fs.readFileSync("apps/customer/app/profile/page.tsx","utf8");
for(const m of["LocationPicker","addressPoint","latitude:addressPoint?.latitude","longitude:addressPoint?.longitude"])if(!profile.includes(m))throw new Error(`Missing explicit address-coordinate marker ${m}`);

console.log("Sprint 16.23 Platform Customer Location, Address Intelligence & Nearby Services structure is valid.");
