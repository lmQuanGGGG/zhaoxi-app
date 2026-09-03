import fs from"node:fs";
for(const f of["SPRINT_16_65.md","SPRINT_16_66.md","apps/customer/app/_components/PersonalizedHomeFeed.tsx","apps/customer/app/_components/CustomerHome.tsx","apps/customer/app/api/customer-home-feed/route.ts","apps/customer/app/discover/page.tsx"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.66.0")throw new Error("Platform version");
for(const x of["verify:16.66","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const h=fs.readFileSync("apps/customer/app/_components/PersonalizedHomeFeed.tsx","utf8");
for(const m of["customer-home-feed","smartResume","favorites","recentlyViewed","recentlyViewedPartners","forYou","/discover"])if(!h.includes(m))throw new Error(`Missing ${m}`);
const home=fs.readFileSync("apps/customer/app/_components/CustomerHome.tsx","utf8");if(!home.includes("<PersonalizedHomeFeed/>"))throw new Error("Personalized Home Feed not mounted");
console.log("Sprint 16.66 Platform Customer Home Personalization, Unified Home Feed & Smart Resume structure is valid.");