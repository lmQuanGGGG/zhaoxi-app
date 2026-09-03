import fs from "node:fs";
const must = [
  "lib/services/marketplace-recommendation-service.ts",
  "app/api/marketplace/recommendations/route.ts",
  "app/api/search/route.ts",
];
for (const file of must) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const rec = fs.readFileSync("lib/services/marketplace-recommendation-service.ts", "utf8");
const search = fs.readFileSync("app/api/search/route.ts", "utf8");
if (!rec.includes("module_fallback") || !rec.includes("usageCount") || !rec.includes("organizationMetadata")) throw new Error("Recommendation engine incomplete");
if (!search.includes('kind: "organization"') || !search.includes('kind: "module"') || !search.includes("serviceHref")) throw new Error("Search 2.0 incomplete");
console.log("Sprint 14.8 backend Dynamic Marketplace Recommendation & Search 2.0 structure is valid.");
