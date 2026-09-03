import fs from "node:fs";
const checks=[
 ["package.json",/"version": "18\.0\.0"/],
 ["apps/admin/app/adminGlass.module.css",/ZhaoXi Adaptive Glass UI 18\.0/],
 ["apps/admin/app/adminGlass.module.css",/--zx-brand:#10B981/],
 ["apps/admin/app/adminGlass.module.css",/@media\(max-width:767px\)/],
 ["apps/admin/app/page.tsx",/phoneBottomNav/],
 ["apps/admin/app/page.tsx",/topPartners/],
 ["packages/theme/src/adaptive-glass.css",/--zx-bg-lavender:#F3E8FF/],
 ["RELEASE_18_0_ADAPTIVE_GLASS_UI_ARCHITECTURE.md",/horizontal page overflow is prohibited/]
];
for(const [file,re] of checks){const s=fs.readFileSync(file,"utf8");if(!re.test(s))throw new Error(`18.0 UI verification failed: ${file} :: ${re}`)}
console.log("ZhaoXi 18.0 Adaptive Glass UI Architecture checkpoint is valid.");
