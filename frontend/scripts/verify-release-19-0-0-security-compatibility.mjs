import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "apps/admin/app/api/delivery/[requestId]/route.ts",
  "apps/admin/app/api/platform-analytics/route.ts",
  "apps/admin/app/api/platform-events/route.ts",
  "apps/admin/app/api/platform-media/route.ts",
  "apps/admin/app/api/platform-notifications/route.ts",
  "apps/admin/app/api/platform-observability/route.ts",
  "apps/admin/app/api/platform-payments/route.ts",
  "apps/admin/app/api/platform-requests/[id]/assignment/route.ts",
  "apps/admin/app/api/platform-requests/[id]/status/route.ts",
  "apps/admin/app/api/platform-requests/route.ts",
  "apps/customer/app/api/delivery/[requestId]/route.ts",
  "apps/customer/app/api/platform-events/route.ts",
  "apps/customer/app/api/platform-notifications/route.ts",
  "apps/customer/app/api/platform-payments/[id]/wechat/native/route.ts",
  "apps/customer/app/api/platform-payments/route.ts",
  "apps/partner/app/api/delivery/[requestId]/route.ts",
  "apps/partner/app/api/media/upload/route.ts",
  "apps/partner/app/api/platform-analytics/route.ts",
  "apps/partner/app/api/platform-events/route.ts",
  "apps/partner/app/api/platform-media/route.ts",
  "apps/partner/app/api/platform-notifications/route.ts",
  "apps/partner/app/api/platform-organizations/[id]/route.ts",
  "apps/partner/app/api/platform-payments/route.ts",
  "apps/partner/app/api/platform-requests/[id]/assignment/route.ts",
  "apps/partner/app/api/platform-requests/[id]/status/route.ts",
  "apps/partner/app/api/platform-services/[id]/route.ts",
  "apps/partner/app/api/platform-services/route.ts",
];

assert.equal(files.length, 27, "Active Platform route inventory must remain 27 files");

for (const relative of files) {
  const absolute = path.join(root, relative);
  assert.ok(fs.existsSync(absolute), `Missing Sprint A Platform route: ${relative}`);
  const source = fs.readFileSync(absolute, "utf8");
  assert.ok(source.includes("zx_access_v2"), `Missing authenticated session forwarding in ${relative}`);
  assert.ok(/authorization\s*:|authorization:`Bearer|authorization:\s*`Bearer/.test(source), `Missing backend Authorization header in ${relative}`);
  assert.ok(source.includes("Bearer"), `Missing bearer credential forwarding in ${relative}`);
}

const partnerUpload = fs.readFileSync(path.join(root, "apps/partner/app/api/media/upload/route.ts"), "utf8");
assert.ok(partnerUpload.includes("/api/auth/session/me"), "Partner media upload must validate the backend session");
assert.ok(partnerUpload.includes('role !== "partner"'), "Partner media upload must require the partner role");
assert.ok(partnerUpload.includes("organizationId !== organizationId"), "Partner media upload must bind uploads to the authenticated organization");

const serviceRoutes = [
  "apps/partner/app/api/platform-services/route.ts",
  "apps/partner/app/api/platform-services/[id]/route.ts",
];
for (const relative of serviceRoutes) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert.ok(source.includes("auth(request)"), `Partner service mutation must forward authenticated credentials: ${relative}`);
}

console.log("ZhaoXi 19.0.0 Platform security compatibility verified: 27 active BFF routes forward authenticated backend credentials.");
