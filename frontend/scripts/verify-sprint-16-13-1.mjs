import fs from "node:fs";
const req=["SPRINT_16_13.md","SPRINT_16_13_1.md","UNIFIED_ENTRY_QR_16_13_1.md","apps/customer/app/entry/page.tsx","apps/customer/app/qr/page.tsx","packages/auth/src/index.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13.1 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.1")throw new Error("Platform version must be 16.13.1");
for(const x of ["verify:16.13.1","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const page=fs.readFileSync("apps/customer/app/entry/page.tsx","utf8");
for(const m of ["客户 · Customer","商家 / 合作伙伴 · Partner","NEXT_PUBLIC_ZHAOXI_PARTNER_URL","WeChat, WhatsApp"])
 if(!page.includes(m))throw new Error(`Missing unified entry marker ${m}`);
console.log("Sprint 16.13.1 Platform Unified Mobile Entry QR structure is valid.");
