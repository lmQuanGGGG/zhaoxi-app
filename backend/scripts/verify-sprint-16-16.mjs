import fs from "node:fs";
for(const f of ["SPRINT_16_15.md","SPRINT_16_16.md","lib/services/customer-support-settings-service.ts","app/api/customer-support-config/route.ts","scripts/migrate-16-16.mjs"])if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.16 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.16.0")throw new Error("Backend version must be 16.16.0");
for(const x of ["db:apply:16.16","verify:16.16","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const schema=fs.readFileSync("db/schema.ts","utf8");for(const m of ["customerSupportSettings","paidHumanFee","basicAssistantEnabled","emergencyPriority"])if(!schema.includes(m))throw new Error(`Missing support schema marker ${m}`);
console.log("Sprint 16.16 Backend Customer Service Experience & ZhaoXi Assistant structure is valid.");
