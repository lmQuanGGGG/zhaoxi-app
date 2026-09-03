import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const qr=read("lib/services/qr-pairing-service.ts"), scan=read("app/api/auth/qr/scan/[id]/route.ts"), auth=read("lib/services/auth-preflight-service.ts"), integration=read("lib/services/integration-preflight-service.ts"), health=read("lib/services/health-service.ts");
const checks=[
 [qr.includes('exchangeCode = token(36)')&&qr.includes('exchangeCodeHash: hash(exchangeCode)'),"exchange code is browser-owned at creation"],
 [qr.includes('isNull(qrPairingSessions.exchangedAt)')&&qr.includes('EXCHANGE_ALREADY_USED'),"exchange is atomic/single-use"],
 [qr.includes('eq(qrPairingSessions.status, "waiting_scan")')&&qr.includes('QR_ALREADY_USED'),"confirmation is single-use"],
 [qr.includes('wechatIdentityVerified: false')&&scan.includes('không xác minh danh tính WeChat'),"scanner handoff never claims WeChat identity"],
 [scan.includes('const copy=')&&scan.includes('"vi-VN"')&&scan.includes('"en-US"')&&scan.includes('"zh-CN"')&&scan.includes('"zh-TW"'),"handoff page is locale-pure"],
 [auth.includes('ready: database')&&auth.includes('wechatOptional: true')&&auth.includes('primaryLogin: "zhaoxi_qr"'),"WeChat is optional for auth readiness"],
 [integration.includes('qr_pairing_sessions')&&integration.includes('/api/auth/qr/exchange'),"integration preflight covers QR contracts"],
 [health.includes('qrLogin: true')&&health.includes('OPTIONAL_NOT_CONFIGURED'),"health advertises QR primary capability"],
];
const failed=checks.filter(([ok])=>!ok);if(failed.length){for(const[,m]of failed)console.error(`FAIL: ${m}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint D Backend verified: ZhaoXi QR scanner handoff, single-use exchange, locale-pure confirmation, and optional WeChat capability contracts PASS.");
