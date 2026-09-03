import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const must=["packages/release/package.json","packages/release/src/index.ts","SPRINT_15_0.md",...["customer","partner","admin","driver"].flatMap(app=>[`apps/${app}/app/error.tsx`,`apps/${app}/app/loading.tsx`,`apps/${app}/app/not-found.tsx`,`apps/${app}/app/api/platform-health/route.ts`])];
for(const file of must){if(!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`)}
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(pkg.version!=="15.0.0") throw new Error("Root version must be 15.0.0");
if(!pkg.scripts?.["verify:15.0"]) throw new Error("Missing verify:15.0 script");
console.log("Sprint 15.0 Platform Beta Release Hardening structure is valid.");
