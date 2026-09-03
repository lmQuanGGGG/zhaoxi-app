import fs from "node:fs";
const req=[
"SPRINT_16_14.md","SPRINT_16_15.md",
"apps/customer/app/_components/CustomerHome.tsx",
"apps/customer/app/_components/MiniTabBar.module.css",
"apps/customer/app/_components/ServiceBrowser.tsx",
"apps/customer/app/messages/page.tsx",
"apps/customer/app/khan-cap/page.tsx",
"apps/customer/app/profile/page.tsx",
"apps/customer/app/api/customer-ui-config/route.ts",
"apps/admin/app/api/customer-ui-config/route.ts",
"apps/admin/app/CustomerExperiencePanel.tsx",
"packages/auth/src/index.tsx",
"packages/support/src/index.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.15 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.15.0")throw new Error("Platform version must be 16.15.0");
for(const s of ["verify:16.15","typecheck:all","build:all"])if(!pkg.scripts?.[s])throw new Error(`Missing script ${s}`);

const home=fs.readFileSync("apps/customer/app/_components/CustomerHome.tsx","utf8");
for(const m of ["/api/customer-ui-config","recommendationCycleSeconds","bannerContent","bannerAutoCycle","recommendCarousel"])
 if(!home.includes(m))throw new Error(`Missing Customer Home contract ${m}`);

const admin=fs.readFileSync("apps/admin/app/CustomerExperiencePanel.tsx","utf8");
for(const m of ["bannerEffect","bannerAutoCycle","recommendationCycleSeconds","bannerContent","/api/customer-ui-config"])
 if(!admin.includes(m))throw new Error(`Missing Admin Customer UI contract ${m}`);

const nav=fs.readFileSync("apps/customer/app/_components/MiniTabBar.module.css","utf8");
for(const m of ["backdrop-filter:blur(26px)","min-height:76px","border-radius:25px"])
 if(!nav.includes(m))throw new Error(`Missing glass navigation marker ${m}`);

const messages=fs.readFileSync("apps/customer/app/messages/page.tsx","utf8");
for(const m of ["glassBackButton","assistantHero","notificationPanel","readAll","deleteAll"])
 if(!messages.includes(m))throw new Error(`Missing Messages hub marker ${m}`);

const emergency=fs.readFileSync("apps/customer/app/khan-cap/page.tsx","utf8");
if(!emergency.includes('href={`/support?topic=${topic}`}'))throw new Error("Emergency choices must route to ZhaoXi Assistant");
const support=fs.readFileSync("packages/support/src/index.tsx","utf8");
for(const m of ["Nhân viên 1-1 (có phí)","1-to-1 staff (paid)","人工 1对1（付费）"])
 if(!support.includes(m))throw new Error(`Missing paid assistant marker ${m}`);

const serviceCss=fs.readFileSync("apps/customer/app/services.module.css","utf8");
for(const m of [".restaurantBanner{height:88px",".restaurantMenu{grid-template-columns:1fr 1fr}",".menuImage{width:46px"])
 if(!serviceCss.includes(m))throw new Error(`Missing compact marketplace marker ${m}`);

for(const route of ["food","housing","visa","car-rental","translation","travel","payment","community","market"])
 if(!fs.existsSync(`apps/customer/app/${route}/page.tsx`) && !fs.existsSync(`apps/customer/app/services/${route}/page.tsx`))
   throw new Error(`Missing Customer service route ${route}`);

const customerFiles=[];
function walk(dir){for(const name of fs.readdirSync(dir)){const full=`${dir}/${name}`;const st=fs.statSync(full);if(st.isDirectory())walk(full);else if(full.endsWith(".tsx"))customerFiles.push(full)}}
walk("apps/customer/app");
const mixed=[
"返回首页 · Trang chủ","Hồ sơ của tôi ·","选择赵喜的显示语言 · Chọn","生活服务 · Dịch vụ đời sống",
"正在进入赵喜…<br/>","游客模式 · Chế độ Guest","合作伙伴中心 · Trung tâm đối tác",
"Đã tiếp nhận nhu cầu ·","Thị thực ·","Nhà hàng ·"
];
for(const f of customerFiles){const text=fs.readFileSync(f,"utf8");for(const m of mixed)if(text.includes(m))throw new Error(`Single-language violation in ${f}: ${m}`)}

console.log("Sprint 16.15 Platform ZhaoXi Unified Customer Experience structure is valid.");
