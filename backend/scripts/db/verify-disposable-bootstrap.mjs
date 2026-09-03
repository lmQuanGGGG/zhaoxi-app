import postgres from "postgres";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const dbName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
if (dbName !== "zhaoxi_b2b_empty") throw new Error("REFUSED: disposable verifier must target zhaoxi_b2b_empty.");
const expected = [
  ["feature_flags", 4], ["runtime_controls", 4], ["release_alert_policies", 5], ["rollout_guard_policies", 3],
  ["customer_ui_settings", 1], ["customer_support_settings", 1], ["delivery_pricing_policies", 1], ["support_sla_policies", 3],
  ["support_tags", 6], ["customer_segments", 3], ["operations_routing_policies", 1], ["operations_playbooks", 3],
];
const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5, ssl: "require" });
try {
  const failures = [];
  for (const [table, min] of expected) {
    const [{ n }] = await sql.unsafe(`select count(*)::int as n from public."${table}"`);
    if (n < min) failures.push(`${table}:${n}<${min}`);
  }
  if (failures.length) { console.error(`BOOTSTRAP_VERIFY_FAIL=${failures.join(",")}`); process.exit(10); }
  console.log("ZhaoXi 19.0.0 disposable bootstrap verification PASS: 12 required datasets present.");
} finally { await sql.end({ timeout: 5 }); }
