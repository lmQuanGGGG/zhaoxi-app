import fs from"node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));if(p.version!=="18.0.3")throw new Error("Platform must be 18.0.3");
const ui=fs.readFileSync("packages/ui/src/mobile-workspace.tsx","utf8");
for(const x of["NativeFilterButton","NativeActionBar","NativeFullScreenSheet","ResponsiveRecordCard"])if(!ui.includes(x))throw new Error(`Missing ${x}`);
for(const app of["admin","customer","partner"]){const g=fs.readFileSync(`apps/${app}/app/globals.css`,"utf8");for(const x of["Native Mobile Interaction Layer","table thead","zx-native-fullsheet","zx-native-actionbar"])if(!g.includes(x))throw new Error(`${app} missing ${x}`)}
console.log("ZhaoXi 18.0.3 Platform Native Mobile Interaction Layer is valid.");
