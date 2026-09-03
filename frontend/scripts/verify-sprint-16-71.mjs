import fs from"node:fs";
for(const f of["SPRINT_16_70.md","SPRINT_16_71.md","apps/admin/app/AdminSupportDesk.tsx","apps/admin/app/CustomerSupportPanel.tsx","apps/admin/app/api/admin-support-desk/route.ts","apps/admin/app/api/admin-support-desk/[threadId]/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.71.0")throw new Error("Platform version");
for(const x of["verify:16.71","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("apps/admin/app/AdminSupportDesk.tsx","utf8");for(const m of["admin-support-desk","assignedAdminUserId","slaOverdue","unreadCount",'action:"assign"','action:"status"','action:"read"'])if(!s.includes(m))throw new Error(`Missing UI ${m}`);
if(!fs.readFileSync("apps/admin/app/CustomerSupportPanel.tsx","utf8").includes("<AdminSupportDesk/>"))throw new Error("Support Desk not mounted");
console.log("Sprint 16.71 Platform Admin Support Desk, Agent Assignment & Customer Conversation Operations structure is valid.");