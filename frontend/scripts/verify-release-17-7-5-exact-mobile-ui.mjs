import fs from"node:fs";
const page=fs.readFileSync("apps/admin/app/page.tsx","utf8"),css=fs.readFileSync("apps/admin/app/adminGlass.module.css","utf8"),auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const x of["heroCard","topPartners","serviceOverview","phoneBottomNav","drawerBackdrop"])if(!page.includes(x))throw new Error(`Missing exact mobile UI element ${x}`);
if(page.includes("Trung tâm thông báo"))throw new Error("Notification card must not appear on Admin overview");
if(page.indexOf("topPartners")>page.indexOf("serviceOverview"))throw new Error("Top partners must appear before service overview");
for(const x of["@media(max-width:767px)","grid-template-columns:repeat(2","phoneBottomNav","drawerBackdrop"])if(!css.includes(x))throw new Error(`Missing mobile layout rule ${x}`);
for(const x of["zx-locale-short","zx-topbar-menu","zhaoxi:mobile-menu","zx-topbar-notify"])if(!auth.includes(x))throw new Error(`Missing exact topbar capability ${x}`);
console.log("ZhaoXi 17.7.5 Exact Mobile UI Match structure is valid.");
