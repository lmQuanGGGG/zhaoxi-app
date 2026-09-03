import fs from "node:fs";
const checks=[
 ["package.json",/verify:13\.9/],
 ["apps/customer/app/AppProviders.tsx",/zx-mobile-app/],
 ["apps/partner/app/AppProviders.tsx",/zx-mobile-app/],
 ["apps/admin/app/AppProviders.tsx",/zx-mobile-app/],
 ["apps/customer/app/messages/page.tsx",/zx-unread-pill/],
 ["apps/customer/app/order/\[id\]/page.tsx",/useZhaoXiLocale/],
 ["apps/customer/app/food/page.tsx",/services\/food/],
 ["packages/branding/src/index.ts",/customerHref:"\/services\/food"/]
];
for(const [file,pattern] of checks){const text=fs.readFileSync(file,"utf8");if(!pattern.test(text))throw new Error(`Sprint 13.9 check failed: ${file}`)}
console.log("Sprint 13.9 mobile UI, single-language flow and modern notifications structure is valid.");
