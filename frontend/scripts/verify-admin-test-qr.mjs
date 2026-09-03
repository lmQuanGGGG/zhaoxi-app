import fs from "node:fs";
const req=["ADMIN_TEST_QR_CHECKPOINT.md","apps/admin/app/auth/admin-qr/page.tsx","apps/admin/app/api/auth/unified/[...path]/route.ts","packages/auth/src/index.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const page=fs.readFileSync("apps/admin/app/auth/admin-qr/page.tsx","utf8");
for(const m of['window.location.hash','/api/auth/unified/admin/card','deviceId','deviceName','window.location.replace("/")'])if(!page.includes(m))throw new Error(`Missing Admin QR login marker ${m}`);
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const m of['Admin Test QR','admin/card','authMethod:data.authMethod||"wechat"'])if(!auth.includes(m))throw new Error(`Missing Admin auth marker ${m}`);
const proxy=fs.readFileSync("apps/admin/app/api/auth/unified/[...path]/route.ts","utf8");if(!proxy.includes('path==="admin/card"'))throw new Error("Admin card proxy missing");
console.log("ZhaoXi 17.7 Admin Test QR Access checkpoint is valid.");
