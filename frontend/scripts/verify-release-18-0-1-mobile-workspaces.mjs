import fs from"node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="18.0.1")throw new Error("Platform version must be 18.0.1");
const css=fs.readFileSync("apps/admin/app/globals.css","utf8");
const ui=fs.readFileSync("packages/ui/src/index.tsx","utf8");
for(const x of["ZhaoXi 18.0.1 — Mobile Workspace Migration","overflow-x:hidden","grid-template-columns:minmax(0,1fr)","SF Pro Display"])if(!css.includes(x))throw new Error(`Missing mobile workspace rule: ${x}`);
for(const x of["mobileWorkspaceTokens","mobileCardStyle","mobileFieldStyle","phoneMax: 767","tabletMax: 1199"])if(!ui.includes(x))throw new Error(`Missing shared workspace primitive: ${x}`);
for(const p of["command-center/page.tsx","support/page.tsx","launch-control/page.tsx","release-center/page.tsx","feature-flags/page.tsx","audit-log/page.tsx"]){if(!fs.existsSync(`apps/admin/app/${p}`))throw new Error(`Missing Admin workspace ${p}`)}
console.log("ZhaoXi 18.0.1 Mobile Workspace Migration checkpoint is valid.");
