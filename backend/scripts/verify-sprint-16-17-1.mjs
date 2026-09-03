import fs from "node:fs";
for(const f of ["SPRINT_16_17.md","SPRINT_16_17_1.md","app/api/service-requests/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.17.1 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.17.1")throw new Error("Backend version must be 16.17.1");
for(const x of ["verify:16.17.1","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
console.log("Sprint 16.17.1 Backend compatibility structure is valid.");
