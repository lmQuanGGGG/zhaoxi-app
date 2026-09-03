import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/partner/app/api/media/upload/route.ts",
  "apps/partner/app/StoreManager.tsx",
  "apps/partner/app/catalog/page.tsx",
  "packages/i18n/src/index.tsx",
  "packages/sdk/src/index.ts",
  "packages/ui/src/index.tsx",
];

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing Sprint 12.7 file: ${file}`);
}

const manager = readFileSync("apps/partner/app/StoreManager.tsx", "utf8");
for (const token of ["chooseLogo", "chooseBanners", "chooseItemImage", "moduleFields", "/api/media/upload"]) {
  if (!manager.includes(token)) throw new Error(`StoreManager is missing ${token}`);
}

const upload = readFileSync("apps/partner/app/api/media/upload/route.ts", "utf8");
if (!upload.includes("@vercel/blob") || !upload.includes("MAX_FILE_SIZE") || !upload.includes("BLOB_READ_WRITE_TOKEN")) {
  throw new Error("Media upload route is incomplete.");
}

const partnerPackage = JSON.parse(readFileSync("apps/partner/package.json", "utf8"));
if (partnerPackage.dependencies?.["@vercel/blob"] !== "2.6.1") {
  throw new Error("@vercel/blob 2.6.1 is not configured.");
}

console.log("Sprint 12.7 media upload and multi-service marketplace structure is valid.");
