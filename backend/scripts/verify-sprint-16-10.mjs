import fs from "node:fs";
const required=[
  "SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md",
  "lib/services/wechat-auth-service.ts","lib/services/session-service.ts","lib/services/auth-preflight-service.ts",
  "app/api/auth/wechat/session/route.ts","app/api/auth/wechat/session/[id]/route.ts","app/api/auth/wechat/callback/route.ts",
  "app/api/auth/session/exchange/route.ts","app/api/auth/session/refresh/route.ts","app/api/auth/session/me/route.ts",
  "app/api/auth/session/logout/route.ts","app/api/auth/session/logout-all/route.ts",
  "app/api/auth/role-switch/create/route.ts","app/api/auth/role-switch/exchange/route.ts",
  "app/api/auth/preflight/route.ts","scripts/migrate-16-10.mjs",
  "lib/services/release-audit-service.ts","lib/services/operations-audit-service.ts","lib/services/operations-command-center-service.ts"
];
for(const f of required) if(!fs.existsSync(f)) throw new Error(`Missing cumulative/auth file: ${f}`);
const schema=fs.readFileSync("db/schema.ts","utf8");
for(const marker of ["wechatLoginSessions","authSessions","releaseAuditEvents","operationsAuditLogs","wechat_login_sessions_status_expires_idx","auth_sessions_user_status_refresh_idx"]) if(!schema.includes(marker)) throw new Error(`Missing schema marker ${marker}`);
const auth=fs.readFileSync("lib/services/wechat-auth-service.ts","utf8");
for(const marker of ["USER_DISABLED","SESSION_NOT_ACTIVE","AbortSignal.timeout(8000)","timingSafeEqual"]) if(!auth.includes(marker)) throw new Error(`Missing auth hardening marker ${marker}`);
const preflight=fs.readFileSync("lib/services/auth-preflight-service.ts","utf8");
for(const marker of ["WECHAT_OPEN_APP_ID","WECHAT_OPEN_APP_SECRET","callbackOrigin","select 1 as ok"]) if(!preflight.includes(marker)) throw new Error(`Missing preflight marker ${marker}`);
console.log("Sprint 16.10 Backend cumulative authentication preflight & WeChat session hardening structure is valid.");
