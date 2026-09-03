import fs from "node:fs";

const checks = [
  ["packages/auth/src/index.tsx", "export function updateSession"],
  ["apps/customer/app/profile/page.tsx", "Chỉnh sửa thông tin"],
  ["apps/customer/app/profile/page.tsx", "updateSession"],
  ["apps/customer/app/_components/CustomerHome.tsx", "href=\"/profile\""],
  ["apps/partner/app/StoreManager.tsx", "<ImagePreview url={logo}"],
  ["apps/partner/app/StoreManager.tsx", "bannerUrls.map"],
  ["apps/partner/app/StoreManager.tsx", "<ImagePreview url={form.image}"],
  ["DEPLOYMENT_STABLE_URLS.md", "production domains"],
];

for (const [file, text] of checks) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(text)) {
    throw new Error(`Missing ${text} in ${file}`);
  }
}

console.log("Sprint 13.0 complete integration structure is valid.");
