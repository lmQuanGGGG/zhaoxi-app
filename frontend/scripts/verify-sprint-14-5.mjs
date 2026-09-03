import fs from "node:fs";
const required=["packages/payment/src/index.ts","apps/customer/app/api/platform-payments/[id]/wechat/native/route.ts","apps/customer/app/request-success/page.tsx","SPRINT_14_5.md"];
for(const file of required)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const pay=fs.readFileSync("packages/payment/src/index.ts","utf8");if(!pay.includes("WeChatNativeCheckout")||!pay.includes("wechatPayCurrency"))throw new Error("Shared payment package missing WeChat Pay v3 contract");
const success=fs.readFileSync("apps/customer/app/request-success/page.tsx","utf8");for(const marker of ["qrDataUrl","platform-payments","wechat/native","paymentStatusLabel"])if(!success.includes(marker))throw new Error(`Missing checkout marker ${marker}`);
console.log("Sprint 14.5 Platform WeChat Pay checkout integration structure is valid.");
