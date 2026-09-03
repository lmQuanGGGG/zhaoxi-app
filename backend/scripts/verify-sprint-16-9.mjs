import fs from "node:fs";
const files=[
  "lib/services/release-audit-service.ts",
  "app/api/release-audit/route.ts",
  "scripts/migrate-16-8.mjs",
  "SPRINT_16_8.md",
  "lib/services/operations-audit-service.ts",
  "lib/services/operations-command-center-service.ts",
  "app/api/operations-audit/route.ts",
  "app/api/operations-command-center/route.ts",
  "scripts/migrate-16-9.mjs",
  "SPRINT_16_9.md"
];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing cumulative Sprint file: ${f}`);
const schema=fs.readFileSync("db/schema.ts","utf8");
if(!schema.includes("export const releaseAuditEvents")||!schema.includes("export const operationsAuditLogs"))throw new Error("Sprint 16.8/16.9 audit schemas must coexist");
const audit=fs.readFileSync("lib/services/operations-audit-service.ts","utf8");
if(!audit.includes("beforeState")||!audit.includes("afterState")||!audit.includes("releaseAuditEvents"))throw new Error("Operations audit trail or Sprint 16.8 compatibility mirror missing");
const command=fs.readFileSync("lib/services/operations-command-center-service.ts","utf8");
if(!command.includes("releaseHealthService.snapshot")||!command.includes("operationsAuditService.recent"))throw new Error("Command center aggregation missing");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="16.9.0")throw new Error("Backend version must be 16.9.0");
if(!p.scripts?.["db:apply:16.8"]||!p.scripts?.["verify:16.8"]||!p.scripts?.["db:apply:16.9"]||!p.scripts?.["verify:16.9"])throw new Error("Cumulative Sprint 16.8/16.9 scripts missing");
console.log("Sprint 16.9 Backend cumulative patch is valid: Sprint 16.8 Release Audit preserved + Operations Command Center & Audit Timeline added.");
