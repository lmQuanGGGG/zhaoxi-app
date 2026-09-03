import fs from "node:fs";
const required=[
"packages/i18n/src/index.tsx","apps/partner/app/StoreManager.tsx","apps/partner/app/catalog/page.tsx",
"apps/partner/app/api/platform-services/route.ts","apps/partner/app/api/platform-organizations/[id]/route.ts",
"apps/customer/app/_components/ServiceBrowser.tsx","apps/customer/app/_components/CustomerOrders.tsx",
"apps/customer/app/_components/MiniTabBar.tsx","apps/customer/app/profile/page.tsx"
];
const missing=required.filter(x=>!fs.existsSync(x));if(missing.length){console.error("Missing:",missing);process.exit(1)}
console.log("Sprint 12.6 marketplace and restaurant experience structure is valid.");
