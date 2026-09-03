import fs from "node:fs";
const req=["SPRINT_16_17_1.md","SPRINT_16_18.md","lib/services/customer-profile-service.ts","app/api/customer-profile/route.ts","app/api/customer-addresses/route.ts","app/api/customer-addresses/[id]/route.ts","scripts/migrate-16-18.mjs"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.18 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.18.0")throw new Error("Backend version must be 16.18.0");
for(const x of ["db:apply:16.18","verify:16.18","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const schema=fs.readFileSync("db/schema.ts","utf8");for(const m of ["customerProfiles","customerSavedAddresses","wechatContactId","isDefault"])if(!schema.includes(m))throw new Error(`Missing customer identity schema marker ${m}`);
const svc=fs.readFileSync("lib/services/customer-profile-service.ts","utf8");for(const m of ["zhaoxiId","trustedDeviceService.promoteUser","addAddress","setDefault","removeAddress"])if(!svc.includes(m))throw new Error(`Missing profile service marker ${m}`);
console.log("Sprint 16.18 Backend Customer Profile, Saved Identity & Personal Center structure is valid.");
