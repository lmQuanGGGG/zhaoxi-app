import fs from"node:fs";
const req=["RELEASE_17_2.md","RELEASE_17_1.md","apps/customer/app/help/page.tsx","apps/customer/app/help/[slug]/page.tsx","apps/customer/app/help/[slug]/HelpArticle.tsx","apps/admin/app/SupportKnowledgePanel.tsx","apps/admin/app/SupportCaseIntelligencePanel.tsx","apps/admin/app/AdminSupportDesk.tsx","apps/customer/app/messages/page.tsx","apps/customer/app/api/public-support-knowledge/route.ts","apps/admin/app/api/admin-support-knowledge/route.ts","apps/admin/app/api/admin-support-intelligence/[threadId]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="17.2.0")throw new Error("Platform version must be 17.2.0");
for(const x of["verify:17.2","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing script ${x}`);
const desk=fs.readFileSync("apps/admin/app/AdminSupportDesk.tsx","utf8");for(const m of["SupportKnowledgePanel","SupportCaseIntelligencePanel"])if(!desk.includes(m))throw new Error(`Missing desk ${m}`);
const help=fs.readFileSync("apps/customer/app/help/page.tsx","utf8");if(!help.includes("public-support-knowledge"))throw new Error("Help Center API missing");
const msg=fs.readFileSync("apps/customer/app/messages/page.tsx","utf8");if(!msg.includes('href="/help"'))throw new Error("Message Center Help link missing");
console.log("ZhaoXi 17.2 Platform Major Cumulative Support Knowledge, Self-Service & Case Intelligence structure is valid.");