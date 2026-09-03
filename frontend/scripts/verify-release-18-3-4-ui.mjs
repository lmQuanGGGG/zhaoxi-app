import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const compact = (value) => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.3.4 UI verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const globalCss = compact(read("apps/customer/app/globals.css"));
const shell = read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss = compact(read("apps/customer/app/_components/CustomerShell.module.css"));
const registry = read("apps/customer/app/_components/customer-service-presentation.ts");
const home = read("apps/customer/app/_components/CustomerHome.tsx");
const services = read("apps/customer/app/services/page.tsx");
const discovery = read("apps/customer/app/discover/PersonalizedDiscoveryHub.tsx");
const housingDetail = read("apps/customer/app/housing/[id]/HousingListingDetail.tsx");
const housingTracker = read("apps/customer/app/housing/requests/HousingInquiryTracker.tsx");
const travelDetail = read("apps/customer/app/travel/[id]/TravelExperienceDetail.tsx");
const travelTracker = read("apps/customer/app/travel/requests/TravelBookingTracker.tsx");
const partnerProfile = read("apps/customer/app/partners/[organizationId]/PublicPartnerTrustProfile.tsx");
const serviceCss = compact(read("apps/customer/app/services/services-hub.module.css"));
const navigation = read("packages/platform/src/role-navigation.tsx");
const platform = read("packages/platform/src/index.tsx");
const messages = compact(read("apps/customer/app/customer-center.module.css")).toLowerCase();

assert(pkg.version === "18.3.4", "root presentation version must be 18.3.4");
assert(pkg.scripts?.["verify:18.3.4"] === "node scripts/verify-release-18-3-4-ui.mjs", "release verifier command is missing");
assert(shell.includes('data-customer-shell="18.3.4"') && platform.includes('?"18.3.4"'), "shared Customer release markers are missing");

for (const token of ["--aurora-page:", "--aurora-glass:", "--aurora-glass-strong:", "--aurora-glass-border:"]) {
  assert(globalCss.includes(token), `shared Aurora token is missing: ${token}`);
}
for (const color of ["#EAE5FF", "#E4F5FF", "#FFF0F5", "#E8FFF5"]) {
  assert(globalCss.toUpperCase().includes(color), `Light Aurora palette is missing: ${color}`);
}
for (const token of ["--aurora-deep-base:", "--aurora-cyan:", "--aurora-blue:", "--aurora-purple:", "--aurora-violet:"]) {
  assert(globalCss.includes(token), `Dark Aurora token is missing: ${token}`);
}
assert(shellCss.includes("background:var(--aurora-page)"), "the shared Customer shell does not own the Aurora background");
assert(shellCss.includes("backdrop-filter:blur(14px)"), "shared glass surface styling is missing");

assert(registry.includes('CUSTOMER_SERVICE_PRESENTATION_RELEASE = "18.3.4"'), "canonical service registry release marker is missing");
const canonicalConsumers = { home, services, discovery, housingDetail, housingTracker, travelDetail, travelTracker, partnerProfile };
for (const [name, consumer] of Object.entries(canonicalConsumers)) assert(consumer.includes("CustomerServiceIcon"), `${name} is not using canonical service icons`);
const legacySemanticIcon = /(?:🍜|🏠|✈️)|moduleCode\s*===\s*["'](?:food|housing|travel)["']\s*\?/u;
for (const [name, consumer] of Object.entries({ discovery, housingDetail, housingTracker, travelDetail, travelTracker, partnerProfile })) assert(!legacySemanticIcon.test(consumer), `${name} still uses a legacy semantic service-icon fallback`);
assert(registry.includes('icon: "services" as const'), "canonical neutral service fallback is missing");
assert(serviceCss.includes("min-height:68px") && serviceCss.includes("border-radius:17px") && serviceCss.includes("backdrop-filter:blur(14px)"), "floating glass service-row styling is missing");
assert(serviceCss.includes('html[data-theme="dark"] .serviceRow>span') && serviceCss.includes("rgba(120,222,216,.18)"), "dark glass service-icon surround is missing");
assert(serviceCss.includes("overflow-x: auto") && serviceCss.includes("height:31px"), "compact horizontal category filter is missing");

assert(navigation.includes('data-authoritative-bottom-navigation="18.3.4"'), "shared bottom navigation marker is missing");
for (const route of ['href:"/"', 'href:"/orders"', 'href:"/services"', 'href:"/messages"', 'href:"/payment"']) assert(navigation.includes(route), `navigation route changed or is missing: ${route}`);
assert(/\.zx-role-bottom-nav img\{[^}]*width:25px;[^}]*height:25px/.test(globalCss), "inactive navigation icon is not 25px");
assert(/\.zx-role-bottom-nav a\.active img\{[^}]*width:38px;[^}]*height:38px/.test(globalCss), "active navigation icon is not 38px");
assert(globalCss.includes("transition:transform .14s ease") && !globalCss.match(/18\.3\.4[^]*transition:[^;}]*\.[3-9]s/), "navigation transition is outside the fast target");
assert(globalCss.includes("env(safe-area-inset-bottom)") && globalCss.includes("contain:layout paint"), "safe-area or dock paint containment is missing");

assert(home.includes("WELCOME_SLIDE_INTERVAL_MS=3000") && home.includes("welcomeDots") && home.includes("landmarkSlides"), "city welcome slider contract is missing");
assert(messages.includes(".chipactive,.chip.chipactive") && messages.includes("color:#fff!important"), "Messages selected chip contrast is missing");
assert(globalCss.includes("prefers-reduced-motion:reduce"), "reduced-motion handling is missing");

console.log("ZhaoXi Customer 18.3.4 Aurora Glass presentation verified; functional routes and contracts preserved.");
