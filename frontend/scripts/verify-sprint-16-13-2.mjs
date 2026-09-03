import fs from "node:fs";
const req=["SPRINT_16_13_1.md","SPRINT_16_13_2.md","apps/customer/app/entry/page.tsx","packages/auth/src/index.tsx"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing Sprint 16.13.2 file: ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(pkg.version!=="16.13.2")throw new Error("Platform version must be 16.13.2");
for(const x of ["verify:16.13.2","typecheck:all","build:all"])if(!pkg.scripts?.[x])throw new Error(`Missing script ${x}`);
const entry=fs.readFileSync("apps/customer/app/entry/page.tsx","utf8");
for(const m of ["localeNames","saveBrowserLocale","?lang=","copy: Record<ZhaoXiLocale","Chọn mục vào","请选择入口"])
 if(!entry.includes(m))throw new Error(`Missing entry locale marker ${m}`);
if(entry.includes("请选择入口 · Chọn mục vào"))throw new Error("Bilingual entry title must be removed");
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const m of ['new URLSearchParams(window.location.search).get("lang")',"saveBrowserLocale(normalizeLocale(urlLocale))"])
 if(!auth.includes(m))throw new Error(`Missing cross-domain locale synchronization marker ${m}`);
console.log("Sprint 16.13.2 Platform Unified Entry Locale Synchronization structure is valid.");
