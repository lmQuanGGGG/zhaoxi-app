import fs from"node:fs";
const css=fs.readFileSync("apps/admin/app/adminGlass.module.css","utf8").replace(/\s/g,"");
const page=fs.readFileSync("apps/admin/app/page.tsx","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="17.7.6")throw new Error("Platform version must be 17.7.6");
for(const x of["@media(max-width:767px)","@media(min-width:768px)and(max-width:1199px)","@media(min-width:1200px)"])if(!css.includes(x))throw new Error(`Missing adaptive breakpoint ${x}`);
for(const x of['"phone"','"tablet"','"desktop"',"dataset.zxDevice"])if(!page.includes(x))throw new Error(`Missing device marker ${x}`);
if(!page.includes("topPartners"))throw new Error("Approved mobile dashboard structure missing");
console.log("ZhaoXi 17.7.6 Adaptive Phone / Tablet UI contract is valid.");
