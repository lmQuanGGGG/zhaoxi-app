import fs from"node:fs";
const ui=fs.readFileSync("packages/ui/src/index.tsx","utf8");
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const x of["auroraBackground","fontFamily","glassStrong","shadowSoft"])if(!ui.includes(x))throw new Error(`Missing shared UI token ${x}`);
for(const x of["zx-global-topbar","toggleTheme","notification","AdminCardLogin","LanguageStep"])if(!auth.includes(x))throw new Error(`Missing shared shell capability ${x}`);
if(auth.includes("登录 · Đăng nhập")||auth.includes("重新生成 · Tạo QR mới")||auth.includes("二维码仅可使用一次，3分钟后失效 · QR"))throw new Error("Bilingual auth copy still present");
for(const app of["admin","customer","partner"]){const g=fs.readFileSync(`apps/${app}/app/globals.css`,"utf8");if(!g.includes("ZhaoXi Unified Visual Architecture 17.7.4"))throw new Error(`Missing unified foundation in ${app}`)}
console.log("ZhaoXi 17.7.4 Unified Visual Architecture baseline is valid.");
