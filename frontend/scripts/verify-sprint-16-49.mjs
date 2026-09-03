import fs from"node:fs";
const req=["SPRINT_16_48.md","SPRINT_16_49.md","apps/admin/app/TravelPlatformFeePanel.tsx","apps/admin/app/TravelOversightPanel.tsx","apps/admin/app/api/admin-travel-fees/route.ts","apps/admin/app/api/admin-travel-fees/[organizationId]/route.ts","apps/admin/app/api/admin-travel-fees/bookings/[requestId]/route.ts","apps/partner/app/TravelPlatformFeeOverview.tsx","apps/partner/app/OperationsBoard.tsx","apps/partner/app/api/partner-travel-fees/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.49.0")throw new Error("Platform version must be 16.49.0");
for(const x of["verify:16.49","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const admin=fs.readFileSync("apps/admin/app/TravelPlatformFeePanel.tsx","utf8");
for(const m of["percentageBps","fixedPerBooking","minimumFee","maximumFee","admin-travel-fees","platformFeeDue","platformFeePaid"])
 if(!admin.includes(m))throw new Error(`Missing Admin fee marker ${m}`);
const partner=fs.readFileSync("apps/partner/app/TravelPlatformFeeOverview.tsx","utf8");
for(const m of["partner-travel-fees","platformFeeDue","platformFeePaid","direct"])if(!partner.includes(m))throw new Error(`Missing Partner fee overview marker ${m}`);
const oversight=fs.readFileSync("apps/admin/app/TravelOversightPanel.tsx","utf8");if(!oversight.includes("<TravelPlatformFeePanel/>"))throw new Error("Travel Platform Fee panel not mounted");
const ops=fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8");if(!ops.includes("<TravelPlatformFeeOverview organizationId={orgId}/>"))throw new Error("Partner Travel Platform Fee overview not mounted");
console.log("Sprint 16.49 Platform Direct-to-Partner Payment Readiness & Platform Usage Fee Foundation structure is valid.");