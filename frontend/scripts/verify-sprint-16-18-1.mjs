import fs from "node:fs";
const req=[
"SPRINT_16_18.md","SPRINT_16_18_1.md",
"apps/customer/app/profile/page.tsx",
"apps/customer/app/hub.module.css",
"apps/customer/app/api/customer-profile/route.ts",
"apps/customer/app/api/customer-addresses/route.ts"
];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.18.1 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.18.1")throw new Error("Platform version must be 16.18.1");
for(const x of ["verify:16.18.1","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);

const profile=fs.readFileSync("apps/customer/app/profile/page.tsx","utf8");
for(const m of ["className={styles.profileField}","className={styles.profileFieldControl}","/api/customer-profile","/api/customer-addresses"])
  if(!profile.includes(m))throw new Error(`Missing Personal Center hotfix marker ${m}`);
const fieldStart=profile.indexOf("function Field");
const infoStart=profile.indexOf("function Info");
const field=profile.slice(fieldStart,infoStart);
if(field.includes("<style>")||field.includes("`label input"))
  throw new Error("Field helper must not contain embedded JSX style blocks");

const css=fs.readFileSync("apps/customer/app/hub.module.css","utf8");
for(const m of [".profileField{",".profileFieldControl{",".profileFieldControl input:focus"])
  if(!css.includes(m))throw new Error(`Missing parser-safe Profile style ${m}`);

console.log("Sprint 16.18.1 Platform Personal Center JSX Stability structure is valid.");
