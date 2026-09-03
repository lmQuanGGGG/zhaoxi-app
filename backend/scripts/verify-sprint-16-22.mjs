import fs from"node:fs";
for(const f of["SPRINT_16_21.md","SPRINT_16_22.md","lib/services/customer-notification-feed-service.ts","app/api/customer-notifications/route.ts","scripts/migrate-16-22.mjs"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.22.0")throw new Error("Backend version must be 16.22.0");
for(const x of["db:apply:16.22","verify:16.22","typecheck","build"])if(!p.scripts?.[x])throw new Error(x);
const s=fs.readFileSync("lib/services/customer-notification-feed-service.ts","utf8");for(const m of["customerNotificationStates","paymentTransactions","supportMessages","deepLink","unreadCount","eventKey"])if(!s.includes(m))throw new Error(m);
console.log("Sprint 16.22 Backend Notification Center, Real-time Updates & Deep Linking structure is valid.");