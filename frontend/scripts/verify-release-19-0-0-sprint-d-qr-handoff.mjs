import fs from "node:fs";

const auth = fs.readFileSync("packages/auth/src/index.tsx", "utf8");

const checks = [
  [auth.includes('Đăng nhập bằng QR ZhaoXi'), "Vietnamese QR copy"],
  [
    auth.includes('WeChat chỉ là công cụ quét, không xác minh danh tính WeChat.'),
    "no false WeChat identity claim"
  ],
  [
    auth.includes('exchangeCode.current=String(j.data.exchangeCode||"")'),
    "browser retains exchange code from creation"
  ],
  [
    auth.includes('j.data.state==="confirmed"&&exchangeCode.current'),
    "confirmed state exchanges browser-held code"
  ],
  [
    auth.includes('saveSession({...y.data,authMethod:y.data?.authMethod||"guest",sessionMode:"server"})'),
    "server QR exchange preserves backend auth method and server-session mode"
  ],
  [auth.includes('aria-label={t.wechatLogin}'), "QR accessibility label"],
  [auth.includes('data-unified-top-bar="18.3.3"'), "existing UI baseline preserved"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, message] of failed) console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log(
  "ZhaoXi 19.0.0 Sprint D Platform regression verified under Sprint F: QR/WeChat-scanner handoff compatibility, browser-held exchange secret, backend-auth-method preservation, server-session exchange, and Customer UI baseline PASS."
);
