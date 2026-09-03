import fs from "node:fs";
const apps=["customer","partner","admin","driver"];
const required=["SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md","SPRINT_16_11.md","packages/auth/src/index.tsx","packages/account/index.tsx"];

for(const app of apps){
  for(const file of [
    `apps/${app}/app/api/integration/preflight/route.ts`,
    `apps/${app}/app/api/auth/preflight/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/[id]/route.ts`,
    `apps/${app}/app/api/auth/unified/[...path]/route.ts`,
    `apps/${app}/app/auth/handoff/page.tsx`,
  ]) required.push(file);
}
for(const file of required) if(!fs.existsSync(file)) throw new Error(`Missing Sprint 16.11 cumulative file: ${file}`);

const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.11.0") throw new Error("Platform version must be 16.11.0");
for(const script of ["verify:16.11","typecheck:all","build:all"]) if(!pkg.scripts?.[script]) throw new Error(`Missing script ${script}`);

const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const marker of [
  'type ZhaoXiRole = "customer" | "partner" | "admin" | "driver"',
  'const polling=useRef(false)',
  'const exchanging=useRef(false)',
  '"/api/auth/unified/session/exchange"',
  'sessionMode?: "legacy" | "server"'
]) if(!auth.includes(marker)) throw new Error(`Missing auth integration marker ${marker}`);

for(const app of apps){
  const integration=fs.readFileSync(`apps/${app}/app/api/integration/preflight/route.ts`,"utf8");
  if(!integration.includes("/api/integration/preflight")||!integration.includes(`platformApp:"${app}"`)||!integration.includes("AbortSignal.timeout(10000)"))
    throw new Error(`Invalid ${app} integration preflight proxy`);
  for(const file of [
    `apps/${app}/app/api/auth/preflight/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/route.ts`,
    `apps/${app}/app/api/auth/wechat/session/[id]/route.ts`,
    `apps/${app}/app/api/auth/unified/[...path]/route.ts`,
  ]){
    const text=fs.readFileSync(file,"utf8");
    if(!text.includes("AbortSignal.timeout(10000)")) throw new Error(`Missing backend timeout guard in ${file}`);
    if(text.includes("localhost:")) throw new Error(`Localhost backend leaked into production proxy ${file}`);
  }
}
console.log("Sprint 16.11 Platform Pre-Production Integration Gate structure is valid.");
