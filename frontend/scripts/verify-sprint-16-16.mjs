import fs from "node:fs";
const req=[
"SPRINT_16_15.md","SPRINT_16_16.md",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/customer/app/_components/ServiceDetail.tsx",
"apps/customer/app/support/page.tsx",
"apps/customer/app/api/customer-support-config/route.ts",
"apps/admin/app/api/customer-support-config/route.ts",
"apps/admin/app/CustomerSupportPanel.tsx",
"packages/support/src/index.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.16 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.16.0")throw new Error("Platform version must be 16.16.0");
for(const x of ["verify:16.16","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const browser=fs.readFileSync("apps/customer/app/_components/ServiceBrowser.tsx","utf8");
for(const m of ["serviceAssistBar","/support?topic=service","moduleMeta","moduleCode"])
 if(!browser.includes(m))throw new Error(`Missing service experience marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/_components/ServiceDetail.tsx","utf8");
for(const m of ["useZhaoXiLocale","MiniTabBar","Hỏi Trợ lý ZhaoXi","/support?topic=service"])
 if(!detail.includes(m))throw new Error(`Missing service detail marker ${m}`);

const supportPage=fs.readFileSync("apps/customer/app/support/page.tsx","utf8");
for(const m of ["Cấp cứu y tế","Công an và mất giấy tờ","Cứu hộ xe và tai nạn","Hỗ trợ lãnh sự","initialPrompt={row.prompt}"])
 if(!supportPage.includes(m))throw new Error(`Missing emergency Assistant marker ${m}`);

const support=fs.readFileSync("packages/support/src/index.tsx","utf8");
for(const m of ["/api/customer-support-config","paidHumanFee","basicAssistantEnabled","initialPrompt","Nhân viên 1-1"])
 if(!support.includes(m))throw new Error(`Missing support package marker ${m}`);

const admin=fs.readFileSync("apps/admin/app/CustomerSupportPanel.tsx","utf8");
for(const m of ["paidHumanFee","paidHumanCurrency","basicAssistantEnabled","emergencyPriority"])
 if(!admin.includes(m))throw new Error(`Missing Admin support marker ${m}`);

const css=fs.readFileSync("apps/customer/app/services.module.css","utf8");
for(const m of [".header{position:sticky;top:78px;",".serviceAssistBar",".primaryAction{position:fixed;bottom:92px;"])
 if(!css.includes(m))throw new Error(`Missing service UI marker ${m}`);

const customerFiles=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const full=`${dir}/${name}`;const st=fs.statSync(full);if(st.isDirectory())walk(full);else if(full.endsWith(".tsx"))customerFiles.push(full)}}
walk("apps/customer/app");
const forbidden=[
"返回首页 · Trang chủ","选择赵喜的显示语言 · Chọn","生活服务 · Dịch vụ đời sống",
"游客模式 · Chế độ Guest","合作伙伴中心 · Trung tâm đối tác",
"医疗急救 ·","Hỗ trợ khẩn cấp ·","Nhà hàng · 餐厅"
];
for(const f of customerFiles){const text=fs.readFileSync(f,"utf8");for(const m of forbidden)if(text.includes(m))throw new Error(`Single-language violation in ${f}: ${m}`)}

console.log("Sprint 16.16 Platform Customer Service Experience & ZhaoXi Assistant structure is valid.");
