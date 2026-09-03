import fs from "node:fs";
const required = [
  "lib/services/payment-service.ts",
  "app/api/payments/route.ts",
  "app/api/payments/[id]/route.ts",
  "app/api/payments/[id]/status/route.ts",
  "app/api/payments/capabilities/route.ts",
  "scripts/migrate-14-4.mjs",
  "SPRINT_14_4.md",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const schema=fs.readFileSync("db/schema.ts","utf8");
if(!schema.includes("paymentTransactions")||!schema.includes("paymentEvents")) throw new Error("Payment schema missing");
const service=fs.readFileSync("lib/services/payment-service.ts","utf8");
for(const marker of ["cash_on_delivery","bank_transfer","wechat_pay","idempotencyKey"]) if(!service.includes(marker)) throw new Error(`Missing payment marker ${marker}`);
console.log("Sprint 14.4 backend Payment Core structure is valid.");
