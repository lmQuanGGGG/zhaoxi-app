import fs from "node:fs";
const file="apps/customer/app/search/page.tsx";
const s=fs.readFileSync(file,"utf8");
if(s.includes("legacy.module.css")) throw new Error("Search page still imports missing legacy.module.css");
if(!s.includes("../services.module.css")) throw new Error("Search page must reuse services.module.css");
if(!fs.existsSync("apps/customer/app/services.module.css")) throw new Error("services.module.css missing");
console.log("Sprint 14.8.1 customer Search 2.0 stylesheet hotfix is valid.");
