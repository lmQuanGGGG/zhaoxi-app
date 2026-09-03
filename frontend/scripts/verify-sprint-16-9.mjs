import fs from "node:fs";
const files=[
  "apps/admin/app/audit-log/page.tsx",
  "apps/admin/app/api/platform-release-audit/route.ts",
  "SPRINT_16_8.md",
  "apps/admin/app/command-center/page.tsx",
  "apps/admin/app/api/platform-command-center/route.ts",
  "apps/admin/app/api/platform-operations-audit/route.ts",
  "SPRINT_16_9.md"
];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing cumulative Sprint file: ${f}`);
const release=fs.readFileSync("apps/admin/app/release-center/page.tsx","utf8");
if(!release.includes('href="/audit-log"')||!release.includes('href="/command-center"'))throw new Error("Release Center must preserve Audit Log and expose Command Center");
const page=fs.readFileSync("apps/admin/app/command-center/page.tsx","utf8");
if(!page.includes("Operations Command Center")||!page.includes("Operations Audit Timeline")||!page.includes("Rollout Guards"))throw new Error("Command Center sections missing");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.9.0")throw new Error("Platform version must be 16.9.0");
if(!p.scripts?.["verify:16.8"]||!p.scripts?.["verify:16.9"])throw new Error("Cumulative Sprint 16.8/16.9 verifier scripts missing");
console.log("Sprint 16.9 Platform cumulative patch is valid: Sprint 16.8 Audit Log preserved + Operations Command Center & Audit Timeline added.");
