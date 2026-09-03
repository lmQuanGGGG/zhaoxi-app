import fs from "node:fs";
const req=["SPRINT_16_19.md","SPRINT_16_20.md","apps/customer/app/_components/CustomerHome.tsx","apps/customer/app/api/customer-recommendations/route.ts","apps/customer/app/hub.module.css"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.20 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.20.0")throw new Error("Platform version must be 16.20.0");
for(const x of ["verify:16.20","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const home=fs.readFileSync("apps/customer/app/_components/CustomerHome.tsx","utf8");
for(const m of ["/api/customer-recommendations","reasonCode","becauseFavorite","becauseViewed","becauseOrdered","personalized"])
 if(!home.includes(m))throw new Error(`Missing personalized Home marker ${m}`);
const proxy=fs.readFileSync("apps/customer/app/api/customer-recommendations/route.ts","utf8");
for(const m of ['request.cookies.get("zx_access_v2")','authorization:`Bearer ${token}`'])
 if(!proxy.includes(m))throw new Error(`Missing authenticated recommendation proxy marker ${m}`);
const forbidden=["因为您已收藏 ·","Vì bạn đã yêu thích ·","热门推荐 ·","Popular now ·"];
for(const m of forbidden)if(home.includes(m))throw new Error(`Single-language recommendation violation: ${m}`);
console.log("Sprint 16.20 Platform Personalized Home & Recommendation Engine structure is valid.");
