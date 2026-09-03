import fs from "node:fs";
const files=["apps/admin/app/release-center/page.tsx","apps/admin/app/ui-acceptance/page.tsx","SPRINT_16_5.md"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const page=fs.readFileSync("apps/admin/app/release-center/page.tsx","utf8");
if(!page.includes("PUBLIC RELEASE FROZEN")||!page.includes("data.publicReady"))throw new Error("Public QA release freeze UI missing");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.5.0")throw new Error("Platform version must be 16.5.0");
console.log("Sprint 16.5 Platform QA Gate Integration & Release Freeze structure is valid.");
