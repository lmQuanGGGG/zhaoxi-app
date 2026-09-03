import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.3.3 UI verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const registry = read(
  "apps/customer/app/_components/customer-service-presentation.ts",
);
const home = read("apps/customer/app/_components/CustomerHome.tsx");
const services = read("apps/customer/app/services/page.tsx");
const serviceDetail = read("apps/customer/app/_components/ServiceDetail.tsx");
const serviceBrowser = read("apps/customer/app/_components/ServiceBrowser.tsx");
const housingBrowser = read("apps/customer/app/_components/HousingBrowser.tsx");
const travelBrowser = read("apps/customer/app/du-lich/TravelBrowser.tsx");
const serviceCss = read("apps/customer/app/services/services-hub.module.css");
const navigation = read("packages/platform/src/role-navigation.tsx");
const globalCss = read("apps/customer/app/globals.css");
const messageCss = read("apps/customer/app/customer-center.module.css");

assert(pkg.version === "18.3.3", "root presentation version must be 18.3.3");
assert(
  pkg.scripts?.["verify:18.3.3"] ===
    "node scripts/verify-release-18-3-3-ui.mjs",
  "release verifier script is missing",
);

for (const id of [
  "food",
  "housing",
  "visa",
  "car-rental",
  "translation",
  "travel",
  "payment",
  "community",
  "market",
  "emergency",
]) {
  assert(
    registry.includes(`asset: asset("${id}")`),
    `shared registry entry is missing: ${id}`,
  );
}
assert(
  home.includes("<CustomerServiceIcon") && home.includes("landmarkSlides"),
  "Home is not using shared service icons and landmark slides",
);
assert(
  services.includes("<CustomerServiceIcon"),
  "Services Center is not using shared service icons",
);
assert(
  serviceDetail.includes("<CustomerServiceIcon") &&
    !serviceDetail.includes("metadata?.emoji"),
  "service detail still has a legacy service-icon fallback",
);
assert(
  serviceBrowser.includes("<CustomerServiceIcon") &&
    !serviceBrowser.includes("currentMeta.icon"),
  "service browser still has a page-specific service icon",
);
assert(
  housingBrowser.includes('<CustomerServiceIcon serviceId="housing"') &&
    !housingBrowser.includes("🏠"),
  "Housing still has a legacy service-icon fallback",
);
assert(
  travelBrowser.includes('<CustomerServiceIcon serviceId="travel"') &&
    !travelBrowser.includes("✈️"),
  "Travel still has a legacy service-icon fallback",
);

assert(
  navigation.includes("UnifiedRoleNavigation") &&
    navigation.includes('data-authoritative-bottom-navigation="18.3.3"'),
  "shared bottom navigation marker is missing",
);
assert(
  /active\(path,\s*i\.href\)/.test(navigation) &&
    navigation.includes("aria-current="),
  "route-aware active navigation is missing",
);
assert(
  /\.zx-role-bottom-nav a\.active img\{[^}]*width:38px;[^}]*height:38px/.test(
    globalCss,
  ),
  "selected navigation icon enlargement is missing",
);
assert(
  globalCss.includes("env(safe-area-inset-bottom)"),
  "safe-area navigation support is missing",
);

for (const token of [
  "--bg:",
  "--bg-elevated:",
  "--surface:",
  "--surface-2:",
  "--surface-glass:",
  "--surface-soft:",
  "--text-primary:",
  "--text-secondary:",
  "--text-muted:",
  "--border:",
  "--border-strong:",
  "--accent:",
  "--accent-soft:",
  "--accent-glow:",
  "--shadow-sm:",
  "--shadow-md:",
  "--shadow-lg:",
]) {
  assert(
    globalCss.includes(token),
    `semantic theme token is missing: ${token}`,
  );
}
assert(
  messageCss.includes("selected-message-chip contrast lock") &&
    /\.chipActive[^}]*color:#fff!important/.test(messageCss),
  "Messages active-chip contrast styling is missing",
);
assert(
  home.includes("WELCOME_SLIDE_INTERVAL_MS=3000") &&
    home.includes("welcomeDots"),
  "3-second welcome slider configuration is missing",
);
for (const name of [
  "dragon-bridge",
  "ba-na-hills",
  "my-khe-beach",
  "marble-mountains",
  "linh-ung",
  "han-river",
]) {
  assert(
    fs.existsSync(`apps/customer/public/ui/18.3.3/landmarks/${name}.webp`),
    `local landmark image is missing: ${name}`,
  );
}
assert(
  serviceCss.includes("grid-template-columns: 50px minmax(0, 1fr) 16px") &&
    !services.includes("sidebar"),
  "duplicated mobile service sidebar architecture remains",
);

console.log("ZhaoXi Customer 18.3.3 dual-theme visual lock verified.");
