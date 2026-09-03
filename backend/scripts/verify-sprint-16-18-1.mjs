import fs from "node:fs";
for(const f of ["SPRINT_16_18.md","SPRINT_16_18_1.md","app/api/customer-profile/route.ts","app/api/customer-addresses/route.ts"])
  if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.18.1 cumulative file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.18.1")throw new Error("Backend version must be 16.18.1");
for(const x of ["verify:16.18.1","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
console.log("Sprint 16.18.1 Backend Personal Center compatibility structure is valid.");
