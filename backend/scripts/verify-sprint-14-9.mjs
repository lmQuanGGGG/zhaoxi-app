import fs from "node:fs";
for(const file of ["lib/services/analytics-service.ts","app/api/analytics/overview/route.ts"])if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="14.9.0")throw new Error("Backend version must be 14.9.0");
console.log("Sprint 14.9 backend Operations Analytics & Platform Health structure is valid.");
