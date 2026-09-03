import { access, readFile } from "node:fs/promises";
const files=[
  "packages/auth/src/index.tsx",
  "packages/platform/src/index.tsx",
  "apps/customer/app/api/auth/wechat/session/route.ts",
  "apps/customer/app/api/auth/wechat/session/[id]/route.ts",
  "apps/partner/app/api/auth/wechat/session/route.ts",
  "apps/partner/app/api/auth/wechat/session/[id]/route.ts",
  "apps/admin/app/api/auth/wechat/session/route.ts",
  "apps/admin/app/api/auth/wechat/session/[id]/route.ts",
];
for(const f of files) await access(new URL(`../${f}`,import.meta.url));
const auth=await readFile(new URL("../packages/auth/src/index.tsx",import.meta.url),"utf8");
for(const token of ["WeChatQrLogin","authMethod","waitingWechat","/api/auth/wechat/session"]) if(!auth.includes(token)) throw new Error(`Missing ${token}`);
if((auth.match(/wechatLogin:/g)||[]).length!==4) throw new Error("WeChat login copy must exist for all four locales.");
console.log("Sprint 14.1 WeChat QR login platform structure is valid.");
