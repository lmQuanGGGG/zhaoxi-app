import fs from"node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="18.0.2")throw new Error("Platform must be 18.0.2");
const ui=fs.readFileSync("packages/ui/src/mobile-workspace.tsx","utf8");
for(const x of["MobileWorkspace","MobileDataList","MobileBottomSheet","useZhaoXiDevice"])if(!ui.includes(x))throw new Error(`Missing ${x}`);
for(const app of["admin","customer","partner"]){const g=fs.readFileSync(`apps/${app}/app/globals.css`,"utf8");if(!g.includes("ZhaoXi 18.0.2 native mobile workspace system"))throw new Error(`Missing native UI layer: ${app}`)}
for(const f of["OperationsCommandCenter.tsx","CustomerOperationsHub.tsx","PartnerPaymentGatewayOversight.tsx","AnalyticsDashboard.tsx"]){const s=fs.readFileSync(`apps/admin/app/${f}`,"utf8");if(!s.includes("zx-native-workspace"))throw new Error(`Admin module not migrated: ${f}`)}
console.log("ZhaoXi 18.0.2 Platform Native Mobile Workspace release is valid.");
