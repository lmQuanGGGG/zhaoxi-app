import fs from"node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="18.0.3")throw new Error("Backend must be 18.0.3");
const c=fs.readFileSync("lib/core/mobile-workspace-contract.ts","utf8");for(const x of["parseWorkspaceQuery","workspaceInteractionContract","full_screen_sheet","bottom_sheet","sticky_toolbar"])if(!c.includes(x))throw new Error(`Missing ${x}`);
if(!fs.existsSync("app/api/platform-workspace-interactions/route.ts"))throw new Error("Interaction endpoint missing");
console.log("ZhaoXi 18.0.3 Backend Native Mobile Interaction Contract is valid.");
