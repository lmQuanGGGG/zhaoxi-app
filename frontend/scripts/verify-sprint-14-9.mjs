import fs from "node:fs";
const required=["packages/analytics/src/index.ts","apps/admin/app/AnalyticsDashboard.tsx","apps/admin/app/api/platform-analytics/route.ts","apps/partner/app/analytics/page.tsx"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="14.9.0")throw new Error("Platform version must be 14.9.0");
console.log("Sprint 14.9 Platform Operations Analytics & Health structure is valid.");
