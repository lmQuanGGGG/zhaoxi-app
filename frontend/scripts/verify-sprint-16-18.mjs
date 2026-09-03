import fs from "node:fs";
const req=[
"SPRINT_16_17_1.md","SPRINT_16_18.md",
"apps/customer/app/profile/page.tsx",
"apps/customer/app/profile/security/page.tsx",
"apps/customer/app/favorites/page.tsx",
"apps/customer/app/history/page.tsx",
"apps/customer/app/coupons/page.tsx",
"apps/customer/app/api/customer-profile/route.ts",
"apps/customer/app/api/customer-addresses/route.ts",
"apps/customer/app/api/customer-addresses/[id]/route.ts",
"apps/customer/app/_components/ServiceRequestForm.tsx"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.18 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.18.0")throw new Error("Platform version must be 16.18.0");
for(const x of ["verify:16.18","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const profile=fs.readFileSync("apps/customer/app/profile/page.tsx","utf8");
for(const m of ["/api/customer-profile","/api/customer-addresses","zhaoxiId","profileCompletedAt","Mức độ hoàn thiện","Thiết bị & đăng nhập"])
  if(!profile.includes(m))throw new Error(`Missing Personal Center marker ${m}`);

const security=fs.readFileSync("apps/customer/app/profile/security/page.tsx","utf8");
for(const m of ["listZhaoXiDevices","revokeZhaoXiDevice","logoutAllZhaoXiSessions","MiniTabBar"])
  if(!security.includes(m))throw new Error(`Missing security marker ${m}`);

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of ['fetch("/api/customer-profile"',"saved?.addressText","saved?.recipientPhone"])
  if(!checkout.includes(m))throw new Error(`Missing saved-profile checkout marker ${m}`);

for(const route of ["favorites","history","coupons"]){
 const text=fs.readFileSync(`apps/customer/app/${route}/page.tsx`,"utf8");
 if(!text.startsWith('"use client";'))throw new Error(`${route} must be a valid client page`);
 if(!text.includes("useZhaoXiLocale"))throw new Error(`${route} must use the global locale`);
}

const files=[];
function walk(dir){for(const n of fs.readdirSync(dir)){const f=`${dir}/${n}`;const st=fs.statSync(f);if(st.isDirectory())walk(f);else if(f.endsWith(".tsx"))files.push(f)}}
walk("apps/customer/app");
const forbidden=[
"返回首页 · Trang chủ","生活服务 · Dịch vụ đời sống","游客模式 · Chế độ Guest",
"个人资料 · Thông tin","设备与登录 ·","优惠券 · Mã","赵喜 · ZHAOXI"
];
for(const f of files){const text=fs.readFileSync(f,"utf8");for(const m of forbidden)if(text.includes(m))throw new Error(`Single-language violation in ${f}: ${m}`)}

console.log("Sprint 16.18 Platform Customer Profile, Saved Identity & Personal Center structure is valid.");
