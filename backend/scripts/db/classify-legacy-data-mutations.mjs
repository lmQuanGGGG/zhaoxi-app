import fs from "node:fs";
import path from "node:path";

const policy = {
  "migrate-15-8.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["feature_flags"], reason: "runtime feature capability defaults" },
  "migrate-15-9.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["runtime_controls"], reason: "per-app access and maintenance defaults" },
  "migrate-16-3.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["release_alert_policies"], reason: "default release monitoring policies" },
  "migrate-16-4.mjs": { class: "HISTORICAL_ONLY", targets: ["ui_acceptance_items"], reason: "release/UI acceptance checklist, not runtime bootstrap" },
  "migrate-16-6.mjs": { class: "HISTORICAL_ONLY", targets: ["runtime_controls"], reason: "backfill absorbed by final schema default on fresh databases" },
  "migrate-16-7.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["rollout_guard_policies"], reason: "default rollout safety policy" },
  "migrate-16-15.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["customer_ui_settings"], reason: "default customer UI configuration" },
  "migrate-16-16.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["customer_support_settings"], reason: "default assistant/support configuration" },
  "migrate-16-19.mjs": { class: "OPTIONAL_SEED_DATA", targets: ["customer_coupons"], reason: "marketing welcome coupon" },
  "migrate-16-25-1.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["delivery_pricing_policies"], reason: "default delivery pricing policy" },
  "migrate-17-0.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["support_sla_policies"], reason: "support SLA configuration; historical thread UPDATEs are excluded on fresh DB" },
  "migrate-17-1.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["support_tags"], reason: "default support taxonomy" },
  "migrate-17-4.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["customer_segments"], reason: "default customer-operations segment taxonomy" },
  "migrate-17-6.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["operations_routing_policies"], reason: "default operations routing policy" },
  "migrate-17-7.mjs": { class: "REQUIRED_BOOTSTRAP_DATA", targets: ["operations_playbooks"], reason: "default operations workflow playbooks" },
};

const root = process.cwd();
const scriptsDir = path.resolve(root, "scripts");
const all = fs.readdirSync(scriptsDir).filter((n) => /^migrate-.*\.mjs$/i.test(n));
const mutations = [];
for (const file of all) {
  const text = fs.readFileSync(path.join(scriptsDir, file), "utf8");
  const insert = (text.match(/\bINSERT\s+INTO\b/gi) || []).length;
  const update = (text.match(/\bUPDATE\s+/gi) || []).length;
  if (insert || update) mutations.push({ file, insert, update, policy: policy[file] ?? null });
}
const unclassified = mutations.filter((x) => !x.policy);
const stalePolicy = Object.keys(policy).filter((file) => !mutations.some((x) => x.file === file));
const byClass = {};
for (const item of mutations) {
  const key = item.policy?.class ?? "UNCLASSIFIED";
  byClass[key] = (byClass[key] ?? 0) + 1;
}
const outDir = path.resolve(root, "artifacts/canonical-baseline/19.0.0");
fs.mkdirSync(outDir, { recursive: true });
const report = { mutationFiles: mutations.length, byClass, unclassified, stalePolicy, mutations };
fs.writeFileSync(path.join(outDir, "bootstrap-data-classification.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`MUTATION_FILES=${mutations.length} REQUIRED_BOOTSTRAP_DATA=${byClass.REQUIRED_BOOTSTRAP_DATA ?? 0} OPTIONAL_SEED_DATA=${byClass.OPTIONAL_SEED_DATA ?? 0} HISTORICAL_ONLY=${byClass.HISTORICAL_ONLY ?? 0} UNCLASSIFIED=${unclassified.length}`);
if (unclassified.length || stalePolicy.length) {
  if (unclassified.length) console.error(`UNCLASSIFIED=${unclassified.map((x) => x.file).join(",")}`);
  if (stalePolicy.length) console.error(`STALE_POLICY=${stalePolicy.join(",")}`);
  process.exit(10);
}
console.log("ZhaoXi 19.0.0 Sprint B2B.2 legacy data classification PASS: all INSERT/UPDATE migration files explicitly classified.");
