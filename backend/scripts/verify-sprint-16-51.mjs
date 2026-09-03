import fs from"node:fs";
const req=["SPRINT_16_50.md","SPRINT_16_51.md","lib/services/payment-provider-adapter-service.ts","lib/services/partner-payment-transaction-service.ts","lib/services/partner-payment-gateway-service.ts","db/schema.ts","scripts/migrate-16-51.mjs","app/api/admin-payment-reconciliation/route.ts","app/api/admin-payment-reconciliation/[requestId]/route.ts","app/api/partner-payment-transactions/route.ts","app/api/partner-payment-reconciliation/[requestId]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.51.0")throw new Error("Backend version must be 16.51.0");
for(const x of["verify:16.51","db:apply:16.51","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const a=fs.readFileSync("lib/services/payment-provider-adapter-service.ts","utf8");
for(const m of["createPayment","queryPayment","closePayment","refundPayment","verifyWebhook","reconcileTransaction","PaymentProviderAdapter"])
 if(!a.includes(m))throw new Error(`Missing adapter operation ${m}`);
const s=fs.readFileSync("db/schema.ts","utf8");for(const m of["partnerPaymentTransactions","idempotencyUnique","providerReference","idempotencyKey"])if(!s.includes(m))throw new Error(`Missing transaction schema ${m}`);
const tx=fs.readFileSync("lib/services/partner-payment-transaction-service.ts","utf8");for(const m of["onConflictDoNothing","reconcile(","partner_payment_reconciliation","mismatches","repaired"])if(!tx.includes(m))throw new Error(`Missing transaction/reconciliation marker ${m}`);
const gw=fs.readFileSync("lib/services/partner-payment-gateway-service.ts","utf8");for(const m of["paymentProviderAdapterService.adapter","partnerPaymentTransactionService.append","intent-created:","partner_webhook"])if(!gw.includes(m))throw new Error(`Gateway transaction integration missing ${m}`);
console.log("Sprint 16.51 Backend Payment Provider Adapter & Transaction Reconciliation structure is valid.");