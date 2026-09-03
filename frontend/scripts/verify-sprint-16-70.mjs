import fs from"node:fs";
const req=["SPRINT_16_69.md","SPRINT_16_70.md","apps/customer/app/messages/page.tsx","apps/customer/app/api/customer-messages/route.ts","apps/customer/app/api/customer-messages/[threadId]/route.ts","apps/customer/app/notifications/page.tsx","apps/customer/app/support/page.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.70.0")throw new Error("Platform version");
for(const x of["verify:16.70","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("apps/customer/app/messages/page.tsx","utf8");
for(const m of["customer-messages","housing","travel","payment","support",'href="/notifications"','href="/support"',"unreadCount"])if(!s.includes(m))throw new Error(`Missing Message Center UI ${m}`);
console.log("Sprint 16.70 Platform Customer Message Center, Conversation Threads & Unified Support Inbox structure is valid.");