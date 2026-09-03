import fs from "node:fs";

const required=[
  "SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md","SPRINT_16_11.md",
  "lib/services/integration-preflight-service.ts",
  "app/api/integration/preflight/route.ts",
  "scripts/migrate-16-11.mjs",
  "lib/services/wechat-auth-service.ts",
  "lib/services/session-service.ts",
  "lib/services/auth-preflight-service.ts",
  "lib/services/release-audit-service.ts",
  "lib/services/operations-audit-service.ts",
  "lib/services/operations-command-center-service.ts"
];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing Sprint 16.11 cumulative file: ${file}`);

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.11.0") throw new Error("Backend version must be 16.11.0");
for(const script of ["db:apply:16.11","verify:16.11","typecheck","build"]) if(!pkg.scripts?.[script]) throw new Error(`Missing script ${script}`);

const gate=fs.readFileSync("lib/services/integration-preflight-service.ts","utf8");
for(const marker of [
  "wechat_login_sessions","auth_sessions","release_audit_events","operations_audit_logs",
  "customer", "partner", "admin", "driver",
  "/api/auth/session/exchange","/api/operations-command-center"
]) if(!gate.includes(marker)) throw new Error(`Missing integration contract marker ${marker}`);

const auth=fs.readFileSync("lib/services/wechat-auth-service.ts","utf8");
if(!auth.includes("appId() && appSecret() && callbackOriginConfigured()")) throw new Error("WeChat readiness must require a valid callback origin");

const routeFiles=[
  "app/api/auth/preflight/route.ts",
  "app/api/auth/wechat/session/route.ts",
  "app/api/auth/wechat/session/[id]/route.ts",
  "app/api/auth/wechat/callback/route.ts",
  "app/api/auth/session/exchange/route.ts",
  "app/api/auth/session/me/route.ts",
  "app/api/auth/session/refresh/route.ts",
  "app/api/auth/session/logout/route.ts",
  "app/api/auth/session/logout-all/route.ts",
  "app/api/organizations/route.ts",
  "app/api/services/route.ts",
  "app/api/service-requests/route.ts",
  "app/api/release-audit/route.ts",
  "app/api/operations-audit/route.ts",
  "app/api/operations-command-center/route.ts"
];
for(const file of routeFiles) if(!fs.existsSync(file)) throw new Error(`Missing integration endpoint: ${file}`);

console.log("Sprint 16.11 Backend Pre-Production Integration Gate structure is valid.");
