import fs from "node:fs";
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(p.version!=="18.1.2") throw new Error("Platform must be 18.1.2");
for(const f of ["apps/partner/app/globals.css","apps/partner/app/KitchenQueue.tsx","apps/admin/app/adminGlass.module.css"]) if(!fs.existsSync(f)) throw new Error("Missing "+f);
const partner=fs.readFileSync("apps/partner/app/globals.css","utf8"); const admin=fs.readFileSync("apps/admin/app/adminGlass.module.css","utf8");
for(const x of ["Partner Aurora Glass containment","zx-kitchen-grid","max-width:520px"]) if(!partner.includes(x)) throw new Error("Partner UI contract missing "+x);
for(const x of ["compact adaptive admin shell","max-width:1199px","phoneBottomNav"]) if(!admin.includes(x)) throw new Error("Admin UI contract missing "+x);
console.log("ZhaoXi 18.1.2 Aurora Glass & Responsive Correction is valid.");
