import fs from"node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="18.0.2")throw new Error("Backend must be 18.0.2");
for(const f of["lib/core/mobile-workspace-contract.ts","app/api/platform-workspace-contract/route.ts"])if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const c=fs.readFileSync("lib/core/mobile-workspace-contract.ts","utf8");for(const x of["cardList:true","bottomSheetFilters:true","mobileToolbar:true","fullScreenModalOnPhone:true"])if(!c.includes(x))throw new Error(`Missing ${x}`);
console.log("ZhaoXi 18.0.2 Backend Adaptive Workspace API Contract release is valid.");
