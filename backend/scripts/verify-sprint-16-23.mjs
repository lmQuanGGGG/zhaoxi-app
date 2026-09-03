import fs from"node:fs";
for(const f of["SPRINT_16_22.md","SPRINT_16_23.md","lib/services/customer-location-service.ts","app/api/customer-nearby-services/route.ts","app/api/customer-location-context/route.ts","lib/services/customer-smart-search-service.ts"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.23.0")throw new Error("Backend version must be 16.23.0");
for(const x of["verify:16.23","typecheck","build"])if(!p.scripts?.[x])throw new Error(x);
const s=fs.readFileSync("lib/services/customer-location-service.ts","utf8");for(const m of["default_address","customerSavedAddresses","distanceKm","organizationMetadata","radiusKm"])if(!s.includes(m))throw new Error(m);
const q=fs.readFileSync("app/api/customer-search/route.ts","utf8");if(!q.includes("validPoint")||!q.includes('url.searchParams.get("lat")'))throw new Error("Search current-location handoff missing");
console.log("Sprint 16.23 Backend Customer Location, Address Intelligence & Nearby Services structure is valid.");