import fs from "node:fs";
const required=[
 "packages/theme/src/index.tsx","packages/platform/src/index.tsx","packages/platform/src/sync.ts","packages/order/src/index.ts","packages/notification/src/index.ts","packages/hooks/src/index.ts","packages/config/src/index.ts","docs/ARCHITECTURE_14_0.md","docs/DEVELOPMENT_RULES.md","SPRINT_14_0_FOUNDATION.md"
];
const missing=required.filter((file)=>!fs.existsSync(file)); if(missing.length){console.error("Missing Foundation files:\n"+missing.join("\n"));process.exit(1);}
const pkg=JSON.parse(fs.readFileSync("package.json","utf8")); if(pkg.version!=="14.0.0"||!pkg.scripts?.["verify:14.0"]){console.error("Foundation package metadata is invalid.");process.exit(1);}
for(const role of ["customer","partner","admin"]){const text=fs.readFileSync(`apps/${role}/app/AppProviders.tsx`,"utf8");if(!text.includes("ZhaoXiFoundationApp")){console.error(`${role} is not migrated to FoundationApp.`);process.exit(1);}}
console.log("Foundation 14.0 shared architecture structure is valid.");
