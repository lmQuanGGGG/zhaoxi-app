import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.2.2 verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
assert(pkg.version === "18.2.2", "root package version must be 18.2.2");
assert(pkg.scripts?.["verify:18.2.2"] === "node scripts/verify-release-18-2-2.mjs", "release verifier npm script is missing");

const globals = read("apps/customer/app/globals.css");
const shell = read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss = read("apps/customer/app/_components/CustomerShell.module.css");
const homeCss = read("apps/customer/app/hub.module.css");
const navigation = read("packages/platform/src/role-navigation.tsx");
const platform = read("packages/platform/src/index.tsx");
const topbar = read("packages/auth/src/index.tsx");

for (const token of [
  "--zx-bg", "--zx-bg-elevated", "--zx-surface", "--zx-surface-glass", "--zx-surface-soft",
  "--zx-border", "--zx-border-soft", "--zx-text", "--zx-text-secondary", "--zx-text-muted",
  "--zx-brand", "--zx-brand-soft", "--zx-icon", "--zx-shadow", "--zx-shadow-soft",
  "--zx-nav-bg", "--zx-nav-active", "--zx-header-bg",
]) assert(globals.includes(token), `semantic Customer token missing: ${token}`);

assert(globals.includes('html[data-theme="dark"]'), "centralized dark theme is missing");
assert(!globals.includes('html[data-theme=dark] section, html[data-theme=dark] article'), "legacy blanket dark card override remains active");
assert(!globals.includes('html[data-theme=dark] main'), "legacy blanket dark page override remains active");
assert(shell.includes('data-customer-shell="18.2.2"'), "authoritative Customer shell marker must be 18.2.2");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.2.2"'), "platform must mount the 18.2.2 Customer architecture");
assert(topbar.includes('data-unified-top-bar="18.2.2"'), "unified top bar marker must be 18.2.2");
assert(navigation.includes('data-authoritative-bottom-navigation="18.2.2"'), "authoritative bottom navigation marker must be 18.2.2");
assert(globals.includes("env(safe-area-inset-bottom)") && shellCss.includes("env(safe-area-inset-bottom)"), "shared safe-area bottom clearance is missing");
assert(globals.includes("height:58px") && shellCss.includes("calc(90px + env(safe-area-inset-bottom))"), "compact nav or shell-level content clearance is missing");
assert(homeCss.includes("white-space:nowrap") && homeCss.includes("text-overflow:ellipsis") && homeCss.includes("font-size:13px"), "mobile Home search typography invariant is missing");
assert(!globals.includes("body{overflow-x:hidden}"), "blanket body overflow hiding must not mask layout defects");

for (const route of ['href:"/"', 'href:"/orders"', 'href:"/services"', 'href:"/messages"', 'href:"/payment"']) {
  assert(navigation.includes(route), `bottom navigation route missing: ${route}`);
}

const screens = [
  "_components/CustomerHome.tsx", "_components/CustomerOrders.tsx", "services/page.tsx",
  "messages/page.tsx", "notifications/CustomerNotificationCenter.tsx", "payment/page.tsx",
  "profile/page.tsx", "khan-cap/page.tsx", "support/page.tsx",
];
for (const file of screens) {
  const source = read(join("apps/customer/app", file));
  assert(source.includes("CustomerShell"), `${file} must use CustomerShell`);
  assert(!source.includes("<MiniTabBar"), `${file} must not mount duplicate navigation`);
}

const services = read("apps/customer/app/services/page.tsx");
assert(services.includes("/api/platform-modules") && services.includes("PersonalizedHomeFeed") && services.includes("taxonomy"), "Service Hub APIs, taxonomy, or recommendations were removed");
const home = read("apps/customer/app/_components/CustomerHome.tsx");
for (const endpoint of ["/api/customer-ui-config", "/api/platform-modules", "/api/customer-recommendations"]) {
  assert(home.includes(endpoint), `Home API capability missing: ${endpoint}`);
}
for (const route of ["page.tsx", "orders/page.tsx", "services/page.tsx", "messages/page.tsx", "notifications/page.tsx", "payment/page.tsx", "profile/page.tsx", "search/page.tsx", "support/page.tsx", "khan-cap/page.tsx", "housing/page.tsx", "travel/page.tsx"]) {
  assert(existsSync(join(root, "apps/customer/app", route)), `required Customer route missing: ${route}`);
}

console.log("ZhaoXi Customer theme and layout stabilization 18.2.2 verified.");
