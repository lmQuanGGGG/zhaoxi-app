import fs from"node:fs";
const req=["SPRINT_16_55.md","SPRINT_16_56.md","lib/services/payment-support-service.ts","lib/services/payment-notification-automation-service.ts","lib/services/payment-operation-service.ts","lib/services/partner-payment-gateway-service.ts","app/api/customer-payment-support/[requestId]/messages/route.ts","app/api/partner-payment-support/[requestId]/messages/route.ts","app/api/payment-notification-automation/evaluate/route.ts","app/api/notifications/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.56.0")throw new Error("Backend version must be 16.56.0");
for(const x of["verify:16.56","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/payment-support-service.ts","utf8");
for(const m of["refundEtaHours","refundEtaAt","customerMessage","partnerMessage","customerReadAt","partnerReadAt","PAYMENT_SUPPORT_MESSAGE:customer","PAYMENT_SUPPORT_MESSAGE:partner"])
 if(!s.includes(m))throw new Error(`Missing support marker ${m}`);
const a=fs.readFileSync("lib/services/payment-notification-automation-service.ts","utf8");
for(const m of["PAYMENT_SUPPORT_SLA_DUE_SOON","PAYMENT_SUPPORT_SLA_OVERDUE","PAYMENT_REFUND_ETA_DUE_SOON","PAYMENT_REFUND_ETA_OVERDUE","slaDueSoonNotifiedAt","refundEtaOverdueNotifiedAt"])
 if(!a.includes(m))throw new Error(`Missing automation marker ${m}`);
const op=fs.readFileSync("lib/services/payment-operation-service.ts","utf8");if(!op.includes('action:"refund_completed"')||!op.includes("refundCompletedAt"))throw new Error("Refund ticket completion integration missing");
const gw=fs.readFileSync("lib/services/partner-payment-gateway-service.ts","utf8");if(!gw.includes('action:"refund_completed"')||!gw.includes("paymentSupportTicket:updatedSupport"))throw new Error("Webhook refund support integration missing");
const n=fs.readFileSync("app/api/notifications/route.ts","utf8");if(!n.includes("paymentNotificationAutomationService.evaluate()")||!n.includes("paymentEvent"))throw new Error("Payment notification integration missing");
console.log("Sprint 16.56 Backend Payment Notification, Refund ETA & Support Messaging Automation structure is valid.");