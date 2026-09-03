import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`18.3.2 verification failed: ${message}`);
};

const pkg = JSON.parse(read("package.json"));
const registry = read(
  "apps/customer/app/_components/customer-service-presentation.ts",
);
const serviceIcon = read(
  "apps/customer/app/_components/CustomerServiceIcon.tsx",
);
const services = read("apps/customer/app/services/page.tsx");
const serviceCss = read("apps/customer/app/services/services-hub.module.css");
const navigation = read("packages/platform/src/role-navigation.tsx");
const globalCss = read("apps/customer/app/globals.css");

assert(pkg.version === "18.3.2", "root presentation version must be 18.3.2");
assert(pkg.scripts?.["verify:18.3.2"], "release verifier script is missing");
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
    `service asset mapping is missing: ${id}`,
  );
  assert(
    fs.existsSync(`apps/customer/public/ui/18.3.2/service-icons/${id}.webp`),
    `service asset is missing: ${id}`,
  );
}
assert(
  serviceIcon.includes("getCustomerServicePresentation"),
  "shared service icon component is not registry-backed",
);
assert(
  services.includes("styles.searchField") &&
    services.includes("styles.categoryRail"),
  "mobile service search/filter rail is missing",
);
assert(
  /grid-template-columns:\s*50px\s+minmax\(0,\s*1fr\)\s+16px/.test(serviceCss),
  "single-column service row geometry is missing",
);
for (const id of ["home", "orders", "services", "messages", "payment"]) {
  assert(
    fs.existsSync(`apps/customer/public/ui/18.3.2/nav-icons/${id}.webp`),
    `navigation asset is missing: ${id}`,
  );
}
assert(
  navigation.includes('data-authoritative-bottom-navigation="18.3.2"'),
  "shared navigation marker is stale",
);
assert(
  navigation.includes("CustomerNavIcon") &&
    /active\(path,\s*i\.href\)/.test(navigation),
  "route-aware dimensional navigation is missing",
);
assert(
  globalCss.includes('data-customer-architecture="18.3.2"') &&
    globalCss.includes("env(safe-area-inset-bottom)"),
  "18.3.2 safe-area navigation CSS is missing",
);
console.log(
  "ZhaoXi Customer 18.3.2 mobile service and navigation presentation verified.",
);
