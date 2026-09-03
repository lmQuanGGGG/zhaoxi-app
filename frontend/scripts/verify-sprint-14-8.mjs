import fs from "node:fs";
const must=["packages/marketplace/package.json","packages/marketplace/src/index.ts","apps/customer/app/api/platform-recommendations/route.ts","apps/customer/app/_components/CustomerHome.tsx","apps/customer/app/search/page.tsx"];
for(const file of must)if(!fs.existsSync(file))throw new Error(`Missing ${file}`);
const home=fs.readFileSync("apps/customer/app/_components/CustomerHome.tsx","utf8");const search=fs.readFileSync("apps/customer/app/search/page.tsx","utf8");
if(home.includes("recommendationCopy")||home.includes('href: "/khach-hang"'))throw new Error("Hard-coded legacy recommendations still present");
if(!home.includes("platform-recommendations")||!home.includes("MarketplaceRecommendation"))throw new Error("Dynamic recommendations not wired");
if(search.includes("搜索服务 · Tìm dịch vụ")||!search.includes("MarketplaceSearchResult"))throw new Error("Search 2.0 locale/UI not wired");
console.log("Sprint 14.8 Platform Dynamic Marketplace Recommendation & Search 2.0 structure is valid.");
