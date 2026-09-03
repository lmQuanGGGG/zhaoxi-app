import fs from "node:fs";
const required=[
  "SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md","SPRINT_16_11.md","SPRINT_16_12.md",
  "lib/services/integration-preflight-service.ts","lib/services/runtime-validation-service.ts",
  "app/api/integration/preflight/route.ts","app/api/integration/runtime/route.ts",
  "scripts/migrate-16-12.mjs","scripts/runtime-check-16-12.mjs",
  "lib/services/wechat-auth-service.ts","lib/services/session-service.ts",
  "lib/services/release-audit-service.ts","lib/services/operations-audit-service.ts",
  "lib/services/operations-command-center-service.ts"
];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing Sprint 16.12 cumulative file: ${file}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.12.0") throw new Error("Backend version must be 16.12.0");
for(const script of ["db:apply:16.12","verify:16.12","runtime:check:16.12","typecheck","build"])
  if(!pkg.scripts?.[script]) throw new Error(`Missing script ${script}`);

const runtime=fs.readFileSync("lib/services/runtime-validation-service.ts","utf8");
for(const marker of ["database_roundtrip","auth_role_contract","wechat_role_contract","session_expiry_contract","wechat_exchange_contract",'release: "16.12"',"secretsExposed: false"])
  if(!runtime.includes(marker)) throw new Error(`Missing runtime validation marker ${marker}`);

const migration=fs.readFileSync("scripts/migrate-16-12.mjs","utf8");
for(const marker of ["information_schema.columns","wechat_login_sessions","auth_sessions","release_audit_events","operations_audit_logs"])
  if(!migration.includes(marker)) throw new Error(`Missing schema contract marker ${marker}`);

console.log("Sprint 16.12 Backend Release Candidate Runtime Validation structure is valid.");
