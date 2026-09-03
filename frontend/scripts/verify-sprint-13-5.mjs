import fs from "node:fs";
const required = [
  "packages/auth/src/index.tsx",
  "apps/partner/app/StoreManager.tsx",
  "apps/customer/app/AppProviders.tsx",
  "apps/partner/app/AppProviders.tsx",
  "apps/admin/app/AppProviders.tsx",
];
for (const file of required) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const auth = fs.readFileSync("packages/auth/src/index.tsx","utf8");
const store = fs.readFileSync("apps/partner/app/StoreManager.tsx","utf8");
if (!auth.includes("zhaoxi-theme") || !auth.includes("backdropFilter")) throw new Error("Shared top bar/theme missing");
if (!store.includes("✓ ${t.syncServices}") || !store.includes("· TEST")) throw new Error("Partner sync/test controls missing");
console.log("Sprint 13.5 shared top bar, theme and final sync structure is valid.");
