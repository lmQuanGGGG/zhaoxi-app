import fs from "node:fs";
const required=["lib/services/wechat-pay-v3-service.ts","app/api/payments/[id]/wechat/native/route.ts","app/api/payments/wechat/notify/route.ts","SPRINT_14_5.md"];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const svc=fs.readFileSync("lib/services/wechat-pay-v3-service.ts","utf8");
for(const marker of ["/v3/pay/transactions/native","WECHATPAY2-SHA256-RSA2048","aes-256-gcm","WECHAT_PAY_PLATFORM_PUBLIC_KEY","WECHAT_PAY_CNY_REQUIRED"]) if(!svc.includes(marker)) throw new Error(`Missing WeChat Pay marker ${marker}`);
const pay=fs.readFileSync("lib/services/payment-service.ts","utf8");
if(!pay.includes('wechatPayCurrency: "CNY"')||!pay.includes('native_v3')) throw new Error("Payment capability not upgraded for WeChat Pay v3");
console.log("Sprint 14.5 backend WeChat Pay API v3 integration structure is valid.");
