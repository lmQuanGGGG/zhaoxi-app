import { existsSync, readFileSync } from "node:fs";
const required = [
  "apps/customer/package.json", "apps/partner/package.json", "apps/admin/package.json",
  "packages/branding/package.json", "packages/ui/package.json"
];
for (const p of required) if (!existsSync(p)) throw new Error(`Missing ${p}`);
const root = JSON.parse(readFileSync("package.json", "utf8"));
if (!Array.isArray(root.workspaces) || root.workspaces.length < 5) throw new Error("Invalid workspaces");
console.log("Workspace structure is valid.");
