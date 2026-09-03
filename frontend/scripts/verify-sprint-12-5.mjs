import fs from "node:fs";
const required = [
  "packages/i18n/src/index.ts",
  "packages/sdk/src/index.ts",
  "packages/ui/src/index.tsx",
  "apps/customer/app/messages/page.tsx",
  "apps/partner/app/OperationsBoard.tsx",
  "apps/admin/app/OperationsBoard.tsx",
];
const missing = required.filter((file) => !fs.existsSync(new URL(`../${file}`, import.meta.url)));
if (missing.length) {
  console.error("Sprint 12.5 missing files:", missing.join(", "));
  process.exit(1);
}
console.log("Sprint 12.5 platform structure is valid.");
