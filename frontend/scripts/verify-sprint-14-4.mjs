import fs from "node:fs";
const required=[
  "packages/payment/package.json",
  "packages/payment/src/index.ts",
  "apps/customer/app/api/platform-payments/route.ts",
  "apps/customer/app/api/platform-payments/capabilities/route.ts",
  "SPRINT_14_4.md",
];
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const payment=fs.readFileSync("packages/payment/src/index.ts","utf8");
for(const marker of ["cash_on_delivery","bank_transfer","wechat_pay","PAYMENT_STATUSES"]) if(!payment.includes(marker)) throw new Error(`Missing ${marker}`);
const form=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
if(!form.includes("paymentCapabilities")||!form.includes("paymentMethod")) throw new Error("Customer payment selector not integrated");
console.log("Sprint 14.4 Platform Payment Core structure is valid.");
