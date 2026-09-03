import fs from "node:fs";
const files=["apps/admin/app/release-center/page.tsx","apps/admin/app/api/platform-releases/route.ts","apps/admin/app/api/platform-releases/[id]/rollback/route.ts","SPRINT_16_1.md"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const page=fs.readFileSync("apps/admin/app/release-center/page.tsx","utf8");
if(!page.includes("Approve + Open Customer PUBLIC")||!page.includes("Rollback snapshot"))throw new Error("Go-live/rollback UI missing");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.1.0")throw new Error("Platform version must be 16.1.0");
console.log("Sprint 16.1 Platform Public Beta Go-Live, Release Approval & Rollback Guard structure is valid.");
