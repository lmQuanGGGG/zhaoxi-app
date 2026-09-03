import fs from "node:fs";
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="13.9.0"||!pkg.scripts["verify:13.9"])throw new Error("Sprint 13.9 backend structure is incomplete");
if(!fs.existsSync("SPRINT_13_9.md"))throw new Error("Missing Sprint 13.9 documentation");
console.log("Sprint 13.9 backend compatibility structure is valid.");
