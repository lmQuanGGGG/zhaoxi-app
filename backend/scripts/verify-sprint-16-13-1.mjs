import fs from "node:fs";
const req=["SPRINT_16_13.md","SPRINT_16_13_1.md","app/api/auth/guest/bootstrap/route.ts","lib/services/trusted-device-service.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13.1 cumulative file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.1")throw new Error("Backend version must be 16.13.1");
for(const x of ["verify:16.13.1","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
console.log("Sprint 16.13.1 Backend Unified Mobile Entry QR compatibility structure is valid.");
