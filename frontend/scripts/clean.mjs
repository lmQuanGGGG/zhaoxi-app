import { rmSync } from "node:fs";
const paths = [
  "node_modules",
  "apps/customer/node_modules", "apps/customer/.next",
  "apps/partner/node_modules", "apps/partner/.next",
  "apps/admin/node_modules", "apps/admin/.next"
];
for (const path of paths) {
  rmSync(path, { recursive: true, force: true });
  console.log(`Removed ${path}`);
}
