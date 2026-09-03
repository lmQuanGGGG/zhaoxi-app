import { access, readFile } from "node:fs/promises";
const required=[
  "migrations/0002_wechat_login.sql",
  "lib/services/wechat-auth-service.ts",
  "app/api/auth/wechat/session/route.ts",
  "app/api/auth/wechat/session/[id]/route.ts",
  "app/api/auth/wechat/callback/route.ts",
];
for (const f of required) await access(new URL(`../${f}`, import.meta.url));
const schema=await readFile(new URL("../db/schema.ts", import.meta.url),"utf8");
if(!schema.includes("wechatLoginSessions")||!schema.includes("userRoles")) throw new Error("Missing WeChat authentication schema.");
const service=await readFile(new URL("../lib/services/wechat-auth-service.ts", import.meta.url),"utf8");
for(const token of ["WECHAT_OPEN_APP_ID","WECHAT_OPEN_APP_SECRET","snsapi_login","PARTNER_NOT_LINKED","ADMIN_NOT_AUTHORIZED"]) if(!service.includes(token)) throw new Error(`Missing ${token}`);
console.log("Sprint 14.1 backend WeChat QR authentication structure is valid.");
