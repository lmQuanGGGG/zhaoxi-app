import fs from "node:fs";
const req=[
"SPRINT_16_16.md","SPRINT_16_17.md",
"apps/customer/app/cart/page.tsx",
"apps/customer/app/_components/CustomerOrders.tsx",
"apps/customer/app/_components/ServiceRequestForm.tsx",
"apps/customer/app/order/[id]/page.tsx",
"apps/customer/app/request-success/page.tsx",
"apps/customer/app/api/platform-requests/route.ts",
"apps/customer/app/api/platform-requests/[id]/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.17 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.17.0")throw new Error("Platform version must be 16.17.0");
for(const x of ["verify:16.17","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const proxy=fs.readFileSync("apps/customer/app/api/platform-requests/route.ts","utf8");
for(const m of ['request.cookies.get("zx_access_v2")','authorization:`Bearer ${token}`','"mine"'])
 if(!proxy.includes(m))throw new Error(`Missing authenticated request proxy marker ${m}`);

const orders=fs.readFileSync("apps/customer/app/_components/CustomerOrders.tsx","utf8");
for(const m of ['mine:"1"',"activeStatuses","orderFilters","orderSummary","setInterval(()=>void load(),10000)"])
 if(!orders.includes(m))throw new Error(`Missing orders hub marker ${m}`);

const cart=fs.readFileSync("apps/customer/app/cart/page.tsx","utf8");
for(const m of ["setQuantity","clearOrganization","MiniTabBar","Mỗi nhà hàng được thanh toán riêng"])
 if(!cart.includes(m))throw new Error(`Missing cart experience marker ${m}`);

const checkout=fs.readFileSync("apps/customer/app/_components/ServiceRequestForm.tsx","utf8");
for(const m of ["useZhaoXiCart","clearOrganization(cartOrg)","cartLocked","<span>ZHAOXI</span>"])
 if(!checkout.includes(m))throw new Error(`Missing checkout marker ${m}`);

const success=fs.readFileSync("apps/customer/app/request-success/page.tsx","utf8");
for(const m of ["useZhaoXiLocale","MiniTabBar","<small>ZHAOXI</small>"])
 if(!success.includes(m))throw new Error(`Missing request success marker ${m}`);

const detail=fs.readFileSync("apps/customer/app/order/[id]/page.tsx","utf8");
for(const m of ["MiniTabBar","Hỏi Trợ lý ZhaoXi","/support?topic=service&order="])
 if(!detail.includes(m))throw new Error(`Missing order detail marker ${m}`);

const files=[];
function walk(dir){for(const n of fs.readdirSync(dir)){const f=`${dir}/${n}`;const st=fs.statSync(f);if(st.isDirectory())walk(f);else if(f.endsWith(".tsx"))files.push(f)}}
walk("apps/customer/app");
const forbidden=["Số lượng đã khóa theo giỏ hàng</small>","赵喜 · ZHAOXI","返回首页 · Trang chủ","生活服务 · Dịch vụ đời sống","游客模式 · Chế độ Guest"];
for(const f of files){const text=fs.readFileSync(f,"utf8");for(const m of forbidden)if(text.includes(m))throw new Error(`Single-language violation in ${f}: ${m}`)}
console.log("Sprint 16.17 Platform Customer Orders, Cart & Transaction Experience structure is valid.");
