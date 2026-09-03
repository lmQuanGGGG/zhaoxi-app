import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  canAccessRequest,
  canAccessSupportConversation,
  canAssignRequest,
  canManageOrganization,
  canManageRequestStatus,
  canUpdatePaymentStatus,
} from "../lib/security/access-policy.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

function contains(source, pattern, label) {
  assert.match(source, pattern, label);
}

function excludes(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

function ordered(source, first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0 && secondIndex > firstIndex, label);
}

const customer = { role: "customer", userId: "customer-a" };
const partner = { role: "partner", userId: "partner-a" };
const driver = { role: "driver", userId: "driver-a" };
const admin = { role: "admin", userId: "admin-a" };
const requestOwned = { customerId: "customer-a", assignedOrganizationId: "org-a" };
const requestOther = { customerId: "customer-b", assignedOrganizationId: "org-b" };

assert.equal(canAccessRequest(customer, requestOwned), true, "owning customer must retain request access");
assert.equal(canAccessRequest(customer, requestOther), false, "unrelated customer request access must fail closed");
assert.equal(canAccessRequest(partner, requestOwned, { hasOrganizationMembership: true }), true, "assigned partner member must retain request access");
assert.equal(canAccessRequest(partner, requestOther, { hasOrganizationMembership: false }), false, "unrelated partner tenant access must fail closed");
assert.equal(canAccessRequest(driver, requestOwned, { isAssignedDriver: true }), true, "assigned driver must retain request access");
assert.equal(canAccessRequest(driver, requestOwned), false, "unassigned driver request access must fail closed");
assert.equal(canAssignRequest(admin), true, "admin assignment must remain available");
assert.equal(canAssignRequest(partner), false, "partner assignment must fail closed");
assert.equal(canManageRequestStatus(partner, requestOwned, { hasOrganizationMembership: true }), true, "assigned partner status update must remain available");
assert.equal(canManageRequestStatus(partner, requestOther), false, "cross-tenant status update must fail closed");
assert.equal(canManageOrganization(partner, true), true, "organization member must retain management access");
assert.equal(canManageOrganization(partner, false), false, "cross-tenant organization management must fail closed");
assert.equal(canAccessSupportConversation(customer, { userId: "customer-a", organizationId: null }, false), true, "support owner must retain access");
assert.equal(canAccessSupportConversation(customer, { userId: "customer-b", organizationId: null }, false), false, "support IDOR must fail closed");
assert.equal(canUpdatePaymentStatus(driver, true, "cash_collected"), true, "assigned driver may record cash collection");
assert.equal(canUpdatePaymentStatus(driver, true, "refunded"), false, "driver may not perform privileged payment transitions");

const files = Object.fromEntries(await Promise.all([
  "app/api/service-requests/route.ts",
  "app/api/service-requests/[id]/route.ts",
  "app/api/service-requests/[id]/assignment/route.ts",
  "app/api/service-requests/[id]/status/route.ts",
  "app/api/organizations/[id]/route.ts",
  "app/api/services/route.ts",
  "app/api/services/[id]/route.ts",
  "app/api/media/route.ts",
  "app/api/media/[id]/route.ts",
  "app/api/payments/route.ts",
  "app/api/payments/[id]/route.ts",
  "app/api/payments/[id]/status/route.ts",
  "app/api/payments/[id]/wechat/native/route.ts",
  "app/api/payments/wechat/notify/route.ts",
  "app/api/support/route.ts",
  "app/api/notifications/route.ts",
  "app/api/analytics/overview/route.ts",
  "app/api/observability/events/route.ts",
  "app/api/observability/summary/route.ts",
  "app/api/delivery/[requestId]/route.ts",
].map(async (relativePath) => [relativePath, await read(relativePath)])));

contains(files["app/api/service-requests/route.ts"], /if \(!session\).*Authentication required/s, "anonymous request listing must be denied");
contains(files["app/api/service-requests/route.ts"], /eq\(serviceRequests\.customerId, session\.userId\)/, "customer listing must bind to authenticated identity");
contains(files["app/api/service-requests/[id]/route.ts"], /mayAccessRequest\(gate\.session, id\)/, "request-by-id must enforce resource policy");
contains(files["app/api/service-requests/[id]/assignment/route.ts"], /requireSession\(request, \["admin"\]\)/, "assignment must require admin");
contains(files["app/api/service-requests/[id]/status/route.ts"], /FORCE_TRANSITION_DENIED/, "force transition must be explicitly denied");
excludes(files["app/api/service-requests/[id]/status/route.ts"], /if \(!force/, "force transition bypass must not remain");
contains(files["app/api/organizations/[id]/route.ts"], /mayManageOrganization\(gate\.session, id\)/, "organization mutation must enforce membership");
contains(files["app/api/services/route.ts"], /mayManageOrganization\(gate\.session, body\.organizationId\)/, "service creation must enforce target tenant");
contains(files["app/api/services/[id]/route.ts"], /mayManageOrganization\(gate\.session,current\.organizationId\)/, "service mutation must enforce resource tenant");
contains(files["app/api/media/route.ts"], /mayManageOrganization\(gate\.session, body\.organizationId\)/, "media creation must enforce target tenant");
contains(files["app/api/media/[id]/route.ts"], /mayManageOrganization\(gate\.session,current\.organizationId\)/, "media mutation must enforce resource tenant");
contains(files["app/api/payments/route.ts"], /mayAccessRequest\(gate\.session, requestId\)/, "payment list/create must enforce request scope");
contains(files["app/api/payments/[id]/route.ts"], /mayAccessPayment\(gate\.session, id\)/, "payment read must enforce resource scope");
contains(files["app/api/payments/[id]/status/route.ts"], /canUpdatePaymentStatus/, "payment mutation must enforce scoped role policy");
contains(files["app/api/payments/[id]/wechat/native/route.ts"], /mayAccessPayment\(gate\.session, id\)/, "native checkout must enforce payment scope");
excludes(files["app/api/payments/wechat/notify/route.ts"], /requireSession/, "cryptographically authenticated provider callback contract must remain unchanged");
contains(files["app/api/support/route.ts"], /mayAccessSupportConversation\(gate\.session, conversationId\)/, "support transcript must enforce participation");
ordered(files["app/api/support/route.ts"], "mayAccessSupportConversation(gate.session, conversationId)", "supportService.respond", "support authorization must precede assistant/AI processing");
contains(files["app/api/support/route.ts"], /\[ORDER_REDACTED\]/, "unauthorized order code must be redacted before assistant/AI processing");
contains(files["app/api/notifications/route.ts"], /gate\.session\.role !== audience/, "notification audience must bind to authenticated role");
contains(files["app/api/notifications/route.ts"], /eq\(serviceRequests\.customerId, gate\.session\.userId\)/, "customer notifications must bind to request ownership");
contains(files["app/api/analytics/overview/route.ts"], /requireSession\(request, \["admin", "partner"\]\)/, "analytics must require privileged role");
contains(files["app/api/observability/events/route.ts"], /requireSession\(request,\["admin"\]\)/, "observability reads must require admin");
contains(files["app/api/observability/events/route.ts"], /const gate=await requireSession\(request\)/, "telemetry ingestion must require a session");
contains(files["app/api/observability/summary/route.ts"], /requireSession\(request,\["admin"\]\)/, "observability summary must require admin");
contains(files["app/api/delivery/[requestId]/route.ts"], /mayAccessRequest\(gate\.session,requestId\)/, "delivery tracking must enforce request scope");

const routePolicyMatrix = [
  ["GET", "/api/service-requests", "owner/assigned tenant/admin"],
  ["GET", "/api/service-requests/:id", "owner/assigned tenant/assigned driver/admin"],
  ["PATCH", "/api/service-requests/:id/assignment", "admin"],
  ["PATCH", "/api/service-requests/:id/status", "assigned tenant/admin; no force"],
  ["PATCH", "/api/organizations/:id", "member/admin"],
  ["POST", "/api/services", "member/admin"],
  ["PATCH", "/api/services/:id", "resource member/admin"],
  ["DELETE", "/api/services/:id", "resource member/admin"],
  ["POST", "/api/media", "member/admin"],
  ["PATCH", "/api/media/:id", "resource member/admin"],
  ["DELETE", "/api/media/:id", "resource member/admin"],
  ["GET", "/api/payments", "request scope"],
  ["POST", "/api/payments", "request scope"],
  ["GET", "/api/payments/:id", "payment request scope"],
  ["PATCH", "/api/payments/:id/status", "scoped partner/driver/admin"],
  ["POST", "/api/payments/:id/wechat/native", "payment request scope"],
  ["GET", "/api/support", "participant/tenant/admin"],
  ["POST", "/api/support", "participant/tenant/admin"],
  ["GET", "/api/notifications", "bound audience scope"],
  ["GET", "/api/analytics/overview", "tenant partner/admin"],
  ["GET", "/api/observability/events", "admin"],
  ["POST", "/api/observability/events", "authenticated principal"],
  ["GET", "/api/observability/summary", "admin"],
  ["GET", "/api/delivery/:requestId", "request scope"],
];

assert.equal(routePolicyMatrix.length, 24, "the complete Sprint A policy matrix must remain covered");
console.log(`ZhaoXi 19.0.0 security containment verified: ${routePolicyMatrix.length} sensitive route methods and 15 required security cases PASS.`);
