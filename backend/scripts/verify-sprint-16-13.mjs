import fs from "node:fs";
const req=["SPRINT_16_12_2.md","SPRINT_16_13.md","app/api/auth/guest/bootstrap/route.ts","lib/services/trusted-device-service.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.0")throw new Error("Backend version must be 16.13.0");
for(const x of ["verify:16.13","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const route=fs.readFileSync("app/api/auth/guest/bootstrap/route.ts","utf8");
for(const m of ["trustedDeviceService.resolve","trustedDeviceService.createForUser","sessionService.issue","identityState","reusedIdentity"])
 if(!route.includes(m))throw new Error(`Missing Guest Bootstrap marker ${m}`);
console.log("Sprint 16.13 Backend Mobile QR Entry & Guest Bootstrap structure is valid.");
