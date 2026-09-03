import fs from "node:fs";
for(const f of ["SPRINT_16_29.md","SPRINT_16_29_1.md","lib/services/food-commercial-service.ts"])
  if(!fs.existsSync(f)) throw new Error(`Missing ${f}`);

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.29.1") throw new Error("Backend version must be 16.29.1");
for(const x of ["verify:16.29.1","typecheck","build"])
  if(!pkg.scripts?.[x]) throw new Error(`Missing script ${x}`);

const s=fs.readFileSync("lib/services/food-commercial-service.ts","utf8");
if(s.includes("lines.push({serviceId:s.id,quantity:q,...price})"))
  throw new Error("Duplicate quantity property still exists");
if(!s.includes("lines.push({serviceId:s.id,...price})"))
  throw new Error("Expected 16.29.1 pricing line missing");

console.log("Sprint 16.29.1 Backend TypeScript hotfix structure is valid.");