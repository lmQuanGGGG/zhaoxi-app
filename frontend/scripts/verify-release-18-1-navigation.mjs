import fs from"node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(!/^18\.1\.(?:0|1)$/.test(p.version))throw new Error("Platform must be 18.1.0 or 18.1.1");
const n=fs.readFileSync("packages/platform/src/role-navigation.tsx","utf8");
for(const x of["UnifiedRoleNavigation","customer:","partner:","admin:","zx-role-bottom-nav","zx-role-menu-sheet"])if(!n.includes(x))throw new Error("Missing "+x);
const foundation=fs.readFileSync("packages/platform/src/index.tsx","utf8");if(!foundation.includes("<UnifiedRoleNavigation role={role}/>"))throw new Error("Navigation not mounted in shared foundation");
for(const app of["customer","partner","admin"]){const c=fs.readFileSync(`apps/${app}/app/globals.css`,"utf8");if(!c.includes("ZhaoXi 18.1 — Unified Mobile Navigation"))throw new Error(app+" navigation CSS missing")}
console.log("ZhaoXi 18.1 Unified Mobile Navigation & Role Experience is valid.");
