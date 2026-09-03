import fs from"node:fs";
const req=["SPRINT_16_64.md","SPRINT_16_65.md","lib/services/customer-personalized-discovery-service.ts","app/api/customer-discovery/hub/route.ts","app/api/customer-discovery/favorites/[serviceId]/route.ts","app/api/customer-discovery/views/[serviceId]/route.ts","app/api/customer-discovery/history/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.65.0")throw new Error("Backend version must be 16.65.0");
for(const x of["verify:16.65","typecheck","build"])if(!p.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/customer-personalized-discovery-service.ts","utf8");
for(const m of["customerFavorites","customerBrowsingHistory","isFavorite","toggleFavorite","recordView","clearHistory","favorites","recentlyViewed","continueViewing","forYou","favoriteWeight:4","recentViewWeight:1","firstPartyActivityOnly:true","noSensitiveProfiling:true","noExternalTracking:true","noCrossAccountSharing:true","customerCanClearHistory:true","paidPlacement:false","trustScoreBoost:false"])
 if(!s.includes(m))throw new Error(`Missing personalization marker ${m}`);
console.log("Sprint 16.65 Backend Personalized Discovery, Customer Favorites & Recently Viewed Hub structure is valid.");