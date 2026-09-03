import fs from "node:fs";
const apps=["customer","partner","admin","driver"];
const required=["SPRINT_16_8.md","SPRINT_16_9.md","SPRINT_16_10.md","packages/auth/src/index.tsx","packages/account/index.tsx"];
for(const app of apps){
  required.push(`apps/${app}/app/api/auth/wechat/session/route.ts`);
  required.push(`apps/${app}/app/api/auth/wechat/session/[id]/route.ts`);
  required.push(`apps/${app}/app/api/auth/unified/[...path]/route.ts`);
  required.push(`apps/${app}/app/api/auth/preflight/route.ts`);
  required.push(`apps/${app}/app/auth/handoff/page.tsx`);
}
for(const f of required) if(!fs.existsSync(f)) throw new Error(`Missing cumulative/auth file: ${f}`);
const auth=fs.readFileSync("packages/auth/src/index.tsx","utf8");
for(const marker of ["const polling=useRef(false)","polling.current||exchanging.current","WECHAT_SESSION_READ_FAILED","sessionMode?: \"legacy\" | \"server\""]) if(!auth.includes(marker)) throw new Error(`Missing platform auth hardening marker ${marker}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
if(!pkg.scripts?.["verify:16.10"]) throw new Error("Missing verify:16.10 script");
console.log("Sprint 16.10 Platform cumulative Pre-Vercel authentication hardening gate structure is valid.");
