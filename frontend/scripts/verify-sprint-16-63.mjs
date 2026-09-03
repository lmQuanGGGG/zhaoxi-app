import fs from"node:fs";
const req=["SPRINT_16_62.md","SPRINT_16_63.md","apps/customer/app/partners/[organizationId]/PublicPartnerTrustProfile.tsx","apps/customer/app/_components/VerifiedPartnerIdentity.tsx","apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx","apps/customer/app/_components/HousingBrowser.tsx","apps/customer/app/du-lich/TravelBrowser.tsx","apps/partner/app/PartnerPublicStorefrontSettings.tsx","apps/partner/app/OperationsBoard.tsx","apps/partner/app/api/partner-public-storefront/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.63.0")throw new Error("Platform version must be 16.63.0");
for(const x of["verify:16.63","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const profile=fs.readFileSync("apps/customer/app/partners/[organizationId]/PublicPartnerTrustProfile.tsx","utf8");
for(const m of["portfolio","moduleCode","publicHref","serviceCount","restaurant","housing","travel","Trust Score","compliance"])
 if(!profile.includes(m))throw new Error(`Missing storefront UI marker ${m}`);
const identity=fs.readFileSync("apps/customer/app/_components/VerifiedPartnerIdentity.tsx","utf8");if(!identity.includes('href={`/partners/${organizationId}`}'))throw new Error("Verified identity does not link to storefront");
for(const f of["apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx","apps/customer/app/_components/HousingBrowser.tsx","apps/customer/app/du-lich/TravelBrowser.tsx"])if(!fs.readFileSync(f,"utf8").includes("VerifiedPartnerIdentity"))throw new Error(`Verified identity missing from ${f}`);
const partner=fs.readFileSync("apps/partner/app/PartnerPublicStorefrontSettings.tsx","utf8");
for(const m of["partner-public-storefront","servicePromise","showPhone","showEmail","Trust Score"])if(!partner.includes(m))throw new Error(`Missing Partner storefront marker ${m}`);
if(!fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8").includes("<PartnerPublicStorefrontSettings organizationId={orgId}/>"))throw new Error("Partner storefront settings not mounted");
console.log("Sprint 16.63 Platform Unified Partner Public Storefront & Service Portfolio structure is valid.");