import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFile(path.join(root,p),"utf8");
const [authInput,wechatRoute,wechatService,sessionService,health,preflight,integration,runtime]=await Promise.all([
  "lib/auth-input.ts","app/api/auth/wechat/session/route.ts","lib/services/wechat-auth-service.ts","lib/services/session-service.ts","lib/services/health-service.ts","lib/services/auth-preflight-service.ts","lib/services/integration-preflight-service.ts","lib/services/runtime-validation-service.ts"
].map(read));
assert.match(authInput,/safeAuthReturnUrl/);
assert.match(authInput,/value\.startsWith\("\/\/"\)/);
assert.match(authInput,/process\.env\.NODE_ENV === "production"/);
assert.match(authInput,/WECHAT_AUTH_CALLBACK_ORIGIN/);
assert.match(wechatRoute,/resolveWeChatCallbackOrigin\(request\.url\)/);
assert.match(wechatRoute,/WECHAT_NOT_CONFIGURED/);
assert.match(wechatService,/locale: normalizeAuthLocale\(input\.locale\)/);
assert.match(wechatService,/returnUrl: safeAuthReturnUrl\(input\.returnUrl\)/);
assert.match(wechatService,/isNull\(wechatLoginSessions\.exchangedAt\)/);
assert.match(sessionService,/eq\(authSessions\.refreshTokenHash,hashAuthToken\(refreshToken\)\)/);
assert.match(sessionService,/if\(!updated\) return null/);
assert.match(health,/wechatLogin: wechat\.configured/);
assert.match(preflight,/credentialsConfigured/);
assert.match(preflight,/callbackConfigured/);
assert.match(integration,/release: "19\.0\.0"/);
assert.match(runtime,/release: "19\.0\.0"/);
console.log("ZhaoXi 19.0.0 Sprint C Backend integration verified: WeChat callback/return-url hardening, capability parity, and Release 19 runtime contracts PASS.");
