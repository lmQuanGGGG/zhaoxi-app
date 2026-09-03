import fs from "node:fs";
const req=["SPRINT_16_12_2.md","SPRINT_16_13.md","packages/auth/src/index.tsx","apps/customer/app/api/auth/unified/[...path]/route.ts","apps/partner/app/api/auth/unified/[...path]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.0")throw new Error("Platform version must be 16.13.0");
for(const x of ["verify:16.13","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const m of ["bootstrapGuestSession","GuestEntryStep","/api/auth/unified/guest/bootstrap","游客模式 · Chế độ Guest"])
 if(!auth.includes(m))throw new Error(`Missing mobile guest entry marker ${m}`);
for(const app of ["customer","partner"]){const proxy=fs.readFileSync(`apps/${app}/app/api/auth/unified/[...path]/route.ts`,"utf8");for(const m of ['TRUSTED_COOKIE','path==="guest/bootstrap"','trustedDeviceToken'])if(!proxy.includes(m))throw new Error(`Missing ${app} proxy marker ${m}`);}
console.log("Sprint 16.13 Platform Mobile QR Entry & Guest Bootstrap structure is valid.");
