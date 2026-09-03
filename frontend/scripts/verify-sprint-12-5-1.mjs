import { existsSync, readFileSync } from "node:fs";

const required = [
  "packages/auth/src/index.tsx",
  "packages/i18n/src/index.tsx",
  "packages/sdk/src/index.ts",
  "packages/ui/src/index.tsx",
  "apps/customer/app/AppProviders.tsx",
  "apps/partner/app/AppProviders.tsx",
  "apps/admin/app/AppProviders.tsx",
];
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing Sprint 12.5.1 core file: ${file}`);
}
for (const app of ["customer", "partner", "admin"]) {
  const pkg = JSON.parse(readFileSync(`apps/${app}/package.json`, "utf8"));
  if (pkg.dependencies?.["@zhaoxi/auth"] !== "1.0.0") throw new Error(`${app} is not connected to @zhaoxi/auth`);
  const layout = readFileSync(`apps/${app}/app/layout.tsx`, "utf8");
  if (!layout.includes("AppProviders")) throw new Error(`${app} layout is not using shared providers`);
}
const sdk = readFileSync("packages/sdk/src/index.ts", "utf8");
if (!sdk.includes("Response | Promise<Response>")) throw new Error("SDK response handling regression detected");
console.log("Sprint 12.5.1 shared platform core is valid.");
