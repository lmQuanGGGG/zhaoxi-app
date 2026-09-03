import fs from"node:fs";
const req=["SPRINT_16_26.md","SPRINT_16_27.md","apps/partner/app/KitchenQueue.tsx","apps/partner/app/OperationsBoard.tsx","apps/partner/app/StoreManager.tsx","apps/partner/app/api/partner-kitchen/route.ts","apps/partner/app/api/partner-food-availability/[id]/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="16.27.0")throw new Error("Platform version must be 16.27.0");
for(const x of["verify:16.27","typecheck:all","build:all"])if(!p.scripts?.[x])throw new Error(x);
const k=fs.readFileSync("apps/partner/app/KitchenQueue.tsx","utf8");for(const m of["setInterval(()=>void load(),5000)","overdueMinutes","urgent","action:\"priority\"","action:\"eta\""])if(!k.includes(m))throw new Error(m);
const o=fs.readFileSync("apps/partner/app/OperationsBoard.tsx","utf8");if(!o.includes("<KitchenQueue organizationId={orgId}/>"))throw new Error("Kitchen queue not mounted");
const s=fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");if(!s.includes("/api/partner-food-availability/"))throw new Error("Authenticated food availability endpoint not used");
console.log("Sprint 16.27 Platform Restaurant Order Management, Kitchen Queue & Partner Operations structure is valid.");