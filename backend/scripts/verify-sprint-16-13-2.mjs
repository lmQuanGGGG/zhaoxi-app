import fs from "node:fs";
for(const f of ["SPRINT_16_13_1.md","SPRINT_16_13_2.md","app/api/auth/guest/bootstrap/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13.2 cumulative file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.2")throw new Error("Backend version must be 16.13.2");
for(const x of ["verify:16.13.2","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
console.log("Sprint 16.13.2 Backend Unified Entry Locale Synchronization compatibility structure is valid.");
