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

for (const route of [
  "app/api/health/route.ts",
  "app/api/auth/identity/capabilities/route.ts",
  "app/api/auth/identity/otp/start/route.ts",
  "app/api/auth/identity/otp/verify/route.ts",
  "app/api/auth/identity/pin/set/route.ts",
  "app/api/auth/identity/pin/login/route.ts",
  "app/api/delivery/quote/route.ts",
  "app/api/delivery-pricing-policy/route.ts",
]) await requirePath(route);

await requireText("db/schema.ts", [/phoneOtpRegistrations/, /pinHash/]);
await requireText("lib/services/otp-identity-service.ts", [
  /UNIMTX_API_BASE_URL/,
  /startUnimatrixOtp/,
  /verifyUnimatrixOtp/,
  /reserveOneTimeUnimatrixOtp/,
  /finalizeUnimatrixOtpRegistration/,
]);
await requireText("lib/services/customer-pin-service.ts", [/hashPin/, /matchesPin/]);

if (failures.length) {
  console.error("Current backend architecture verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Current backend architecture verified: health, OTP/PIN identity, one-time Unimatrix registration, delivery pricing.");
