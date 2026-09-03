import fs from "node:fs";
const apps=["customer","partner","admin","driver"];
const required=["SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md","SPRINT_16_11.md","SPRINT_16_12.md","packages/auth/src/index.tsx","packages/account/index.tsx"];
for(const app of apps){
  for(const file of [
    `apps/${app}/app/api/integration/preflight/route.ts`,
    `apps/${app}/app/api/integration/runtime/route.ts`,
    `apps/${app}/app/api/auth/preflight/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/[id]/route.ts`,
    `apps/${app}/app/api/auth/unified/[...path]/route.ts`,
    `apps/${app}/app/auth/handoff/page.tsx`,
  ]) required.push(file);
}
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing Sprint 16.12 cumulative file: ${file}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.12.0") throw new Error("Platform version must be 16.12.0");
for(const script of ["verify:16.12","typecheck:all","build:all"]) if(!pkg.scripts?.[script]) throw new Error(`Missing script ${script}`);

const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const marker of ['type ZhaoXiRole = "customer" | "partner" | "admin" | "driver"','"/api/auth/unified/session/exchange"','sessionMode?: "legacy" | "server"'])
  if(!auth.includes(marker)) throw new Error(`Missing preserved auth marker ${marker}`);

for(const app of apps){
  const runtime=fs.readFileSync(`apps/${app}/app/api/integration/runtime/route.ts`,"utf8");
  for(const marker of ["/api/integration/runtime",`platformApp:"${app}"`,'platformRelease:"16.12"',"AbortSignal.timeout(10000)"])
    if(!runtime.includes(marker)) throw new Error(`Invalid ${app} runtime gate marker ${marker}`);
  if(runtime.includes("localhost:")) throw new Error(`Localhost backend leaked into ${app} runtime proxy`);
}
console.log("Sprint 16.12 Platform Release Candidate Runtime Validation structure is valid.");
