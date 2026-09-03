import fs from"node:fs";
const req=["SPRINT_16_55.md","SPRINT_16_56.md","apps/customer/app/travel/requests/PaymentSupportPanel.tsx","apps/customer/app/travel/requests/TravelBookingTracker.tsx","apps/customer/app/CustomerOrderAlerts.tsx","apps/customer/app/api/customer-payment-support/[requestId]/messages/route.ts","apps/partner/app/PartnerPaymentSupportPanel.tsx","apps/partner/app/PaymentSupportNotificationAlerts.tsx","apps/partner/app/AppProviders.tsx","apps/partner/app/api/partner-payment-support/[requestId]/messages/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.56.0")throw new Error("Platform version must be 16.56.0");
for(const x of["verify:16.56","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const c=fs.readFileSync("apps/customer/app/travel/requests/PaymentSupportPanel.tsx","utf8");
for(const m of["refundEtaAt","customer-payment-support","/messages","customerReadAt","sender===\"partner\""])
 if(!c.includes(m))throw new Error(`Missing Customer support UI marker ${m}`);
const pr=fs.readFileSync("apps/partner/app/PartnerPaymentSupportPanel.tsx","utf8");
for(const m of["refundEtaHours","partner-payment-support","/messages","partnerReadAt"])if(!pr.includes(m))throw new Error(`Missing Partner support UI marker ${m}`);
const alert=fs.readFileSync("apps/customer/app/CustomerOrderAlerts.tsx","utf8");
for(const m of["paymentEvent","PAYMENT_SUPPORT_MESSAGE:","PAYMENT_REFUND_ETA_OVERDUE","paymentView"])if(!alert.includes(m))throw new Error(`Missing Customer payment alert ${m}`);
const pa=fs.readFileSync("apps/partner/app/PaymentSupportNotificationAlerts.tsx","utf8");
for(const m of["PAYMENT_SUPPORT_OPENED:","PAYMENT_SUPPORT_MESSAGE:customer","PAYMENT_SUPPORT_SLA_OVERDUE","PAYMENT_REFUND_ETA_OVERDUE"])if(!pa.includes(m))throw new Error(`Missing Partner payment alert ${m}`);
const ap=fs.readFileSync("apps/partner/app/AppProviders.tsx","utf8");if(!ap.includes("<PaymentSupportNotificationAlerts/>"))throw new Error("Partner payment support alerts not mounted");
console.log("Sprint 16.56 Platform Payment Notification, Refund ETA & Support Messaging Automation structure is valid.");