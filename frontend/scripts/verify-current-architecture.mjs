import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function requirePath(relativePath) {
  if (!(await exists(relativePath))) failures.push(`Missing: ${relativePath}`);
}

async function requireText(relativePath, patterns) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`${relativePath} does not match ${pattern}`);
  }
}

for (const app of ["customer", "partner", "admin"]) {
  await requirePath(`apps/${app}/app`);
  await requirePath(`apps/${app}/app/api/platform-health/route.ts`);
  await requirePath(`apps/${app}/app/api/auth/unified/[...path]/route.ts`);
}

if (await exists("apps/driver")) failures.push("apps/driver must not exist in the active frontend");

await requireText("package.json", [
  /"build:all"\s*:\s*"npm run build:customer && npm run build:partner && npm run build:admin"/,
]);
await requireText("packages/auth/src/index.tsx", [
  /function PhoneEntryStep/,
  /identity\/otp\/start/,
  /identity\/otp\/verify/,
  /identity\/pin\/set/,
  /identity\/pin\/login/,
  /dialCode\s*===\s*"\+86"/,
]);

for (const app of ["customer", "partner", "admin"]) {
  const roleSwitch = await readFile(
    path.join(root, `apps/${app}/app/api/platform-account/role-switch/route.ts`),
    "utf8",
  );
  if (/ZHAOXI_DRIVER_URL|zhaoxi-driver/.test(roleSwitch)) {
    failures.push(`apps/${app} still links to the removed driver app`);
  }
}

if (failures.length) {
  console.error("Current frontend architecture verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Current frontend architecture verified: customer, partner, admin; phone OTP + PIN; no driver app.");
