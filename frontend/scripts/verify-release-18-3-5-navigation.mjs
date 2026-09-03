import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const compact = (value) => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.3.5 navigation verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const platform = compact(read("packages/platform/src/index.tsx"));
const navigation = compact(read("packages/platform/src/role-navigation.tsx"));
const globalCss = compact(read("apps/customer/app/globals.css"));
const releaseCss = globalCss.slice(globalCss.indexOf('[data-customer-architecture="18.3.5"]'));
const miniTabCss = compact(read("apps/customer/app/_components/MiniTabBar.module.css"));
const registry = read("apps/customer/app/_components/customer-service-presentation.ts");
const home = read("apps/customer/app/_components/CustomerHome.tsx");
const discovery = read("apps/customer/app/discover/PersonalizedDiscoveryHub.tsx");

assert(pkg.version === "18.3.5", "root release version must be 18.3.5");
assert(pkg.scripts?.["verify:18.3.5"] === "node scripts/verify-release-18-3-5-navigation.mjs", "release verifier command is missing");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.3.5":undefined}') && platform.includes("<UnifiedRoleNavigation role={role}/>"), "shared Customer navigation mount or release marker changed");
assert(navigation.includes('data-authoritative-bottom-navigation="18.3.5"'), "authoritative BottomNav marker is missing");

const customerItems = navigation.match(/customer:\[([\s\S]*?)\], partner:/)?.[1] || "";
const destinations = [...customerItems.matchAll(/href:"([^"]+)"/g)].map((match) => match[1]);
assert(JSON.stringify(destinations) === JSON.stringify(["/", "/orders", "/services", "/messages", "/payment"]), "Customer destinations changed or are not exactly the required five");
assert(navigation.includes('import Link from"next/link"') && navigation.includes('prefetch={true}') && navigation.includes('role==="customer"?<Link'), "Customer routes are not using prefetched Next.js client navigation");
assert(navigation.includes('usePathname') && navigation.includes('onPointerDown=') && navigation.includes("pending?.from===pathname"), "route-aware optimistic pointer feedback is missing");
assert(!navigation.includes("customerNavAssets") && !navigation.includes(".webp") && !navigation.includes("CustomerNavIcon") && !navigation.includes("<img"), "BottomNav still uses bitmap or service-style icons");
assert(navigation.includes("function Icon") && navigation.includes('<svg viewBox="0 0 24 24"'), "shared flat vector icon renderer is missing");

const inactiveSize = Number(releaseCss.match(/\.zx-role-bottom-nav svg\{[^}]*width:(\d+)px;[^}]*height:\1px/)?.[1]);
const activeScale = Number(releaseCss.match(/\.zx-role-bottom-nav a\.active svg\{[^}]*transform:scale\(([\d.]+)\)/)?.[1]);
const transitionSeconds = Number(releaseCss.match(/\.zx-role-bottom-nav svg\{[^}]*transition:transform \.([\d]+)s/)?.[1]) / 100;
assert(inactiveSize >= 22 && inactiveSize <= 24, "inactive vector icon is not approximately 23px");
assert(activeScale * inactiveSize >= 31 && activeScale * inactiveSize <= 33, "active vector icon is not approximately 32px");
assert(/\.zx-role-bottom-nav a span\{[^}]*width:42px;[^}]*height:42px/.test(releaseCss), "fixed 42px icon slot is missing");
assert(transitionSeconds > 0 && transitionSeconds <= 0.1, "icon transition exceeds 100ms");
assert(/\.zx-role-bottom-nav a\{[^}]*height:56px/.test(releaseCss), "navigation touch target is below 44px");
assert(releaseCss.includes("a:active{transform:scale(.92);transition-duration:.06s}"), "fast pointer-down tap feedback is missing");
assert(releaseCss.includes("radial-gradient(circle,rgba(45,220,170,.22)") && releaseCss.includes("background:rgba(255,255,255,.62)"), "Light flat-glass lens or capsule is missing");
assert(releaseCss.includes("background:rgba(5,25,28,.60)") && releaseCss.includes("rgba(150,255,230,.16)"), "Dark flat-glass capsule is missing");
assert(releaseCss.includes("-webkit-backdrop-filter:blur(18px)") && releaseCss.includes("env(safe-area-inset-bottom)") && releaseCss.includes("contain:layout paint"), "WebKit glass, safe area, or paint containment regressed");
assert(miniTabCss.includes(".bar{display:none}"), "legacy nested MiniTabBar can still become visible");

assert(registry.includes('CUSTOMER_SERVICE_PRESENTATION_RELEASE = "18.3.4"'), "approved canonical service registry changed");
assert(home.includes("CustomerServiceIcon") && discovery.includes("CustomerServiceIcon"), "approved 18.3.4 service icons are no longer canonical");

console.log("ZhaoXi Customer 18.3.5 ultra-fast flat glass navigation verified; routes and 18.3.4 service presentation preserved.");
