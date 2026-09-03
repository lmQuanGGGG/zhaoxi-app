import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.2.3 verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
assert(pkg.version === "18.2.3", "root package version must be 18.2.3");
assert(pkg.scripts?.["verify:18.2.3"] === "node scripts/verify-release-18-2-3.mjs", "release verifier npm script is missing");

const globals = read("apps/customer/app/globals.css");
const shell = read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss = read("apps/customer/app/_components/CustomerShell.module.css");
const homeCss = read("apps/customer/app/hub.module.css");
const serviceCss = read("apps/customer/app/services/services-hub.module.css");
const recommendations = read("apps/customer/app/_components/PersonalizedHomeFeed.tsx");
const navigation = read("packages/platform/src/role-navigation.tsx");
const platform = read("packages/platform/src/index.tsx");
const topbar = read("packages/auth/src/index.tsx");

for (const token of [
  "--customer-bg", "--customer-bg-elevated", "--customer-surface", "--customer-surface-strong",
  "--customer-glass", "--customer-border", "--customer-border-soft", "--customer-text-primary",
  "--customer-text-secondary", "--customer-text-muted", "--customer-brand", "--customer-brand-strong",
  "--customer-shadow", "--customer-shadow-elevated", "--font-page-title", "--font-section-title",
  "--font-service-label", "--font-bottom-nav", "--radius-pill",
]) assert(globals.includes(token), `Customer visual token missing: ${token}`);

assert(globals.includes('html[data-theme="dark"]'), "centralized dark theme is missing");
assert(shell.includes('data-customer-shell="18.2.3"'), "authoritative Customer shell marker must be 18.2.3");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.2.3"'), "platform must mount the 18.2.3 Customer architecture");
assert(topbar.includes('data-unified-top-bar="18.2.3"'), "unified top bar marker must be 18.2.3");
assert(navigation.includes('data-authoritative-bottom-navigation="18.2.3"'), "authoritative bottom navigation marker must be 18.2.3");
assert(globals.includes("env(safe-area-inset-top)") && globals.includes("env(safe-area-inset-bottom)") && shellCss.includes("env(safe-area-inset-bottom)"), "safe-area coverage is missing");
assert(homeCss.includes("white-space:nowrap") && homeCss.includes("text-overflow:ellipsis") && homeCss.includes("height:54px"), "single-line Home search invariant is missing");
assert(serviceCss.includes("grid-template-columns:repeat(4,minmax(0,1fr))") && serviceCss.includes("min-height:108px"), "four-column mobile service geometry is missing");
assert(recommendations.includes('background:"var(--customer-surface)"') && !recommendations.includes('background:"#fff"'), "recommendation cards are not theme semantic");

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

const home = read("apps/customer/app/_components/CustomerHome.tsx");
for (const endpoint of ["/api/customer-ui-config", "/api/platform-modules", "/api/customer-recommendations"]) {
  assert(home.includes(endpoint), `Home API capability missing: ${endpoint}`);
}
for (const route of ["page.tsx", "orders/page.tsx", "services/page.tsx", "messages/page.tsx", "notifications/page.tsx", "payment/page.tsx", "profile/page.tsx", "search/page.tsx", "support/page.tsx", "khan-cap/page.tsx", "housing/page.tsx", "travel/page.tsx"]) {
  assert(existsSync(join(root, "apps/customer/app", route)), `required Customer route missing: ${route}`);
}

console.log("ZhaoXi Customer 18.2.3 visual system lock verified.");
