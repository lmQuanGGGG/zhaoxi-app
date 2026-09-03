import fs from "node:fs";
const files=["lib/services/release-approval-service.ts","app/api/releases/admin/route.ts","app/api/releases/admin/[id]/rollback/route.ts","scripts/migrate-16-1.mjs","SPRINT_16_1.md"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const s=fs.readFileSync("lib/services/release-approval-service.ts","utf8");
if(!s.includes("releaseReadinessService.check()")||!s.includes("db.transaction"))throw new Error("Release guard/rollback missing");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.1.0")throw new Error("Backend version must be 16.1.0");
console.log("Sprint 16.1 Backend Public Beta Go-Live, Release Approval & Rollback Guard structure is valid.");
