import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// Configures and approves the ZhaoXi-operated Đà Nẵng stores the same way the
// Admin app does, so every step lands in operations_audit_logs:
//  - store: contact phone (STORE_PHONE) + "verified_partner" trust badge
//    (partner-trust-governance-service.issue)
//  - housing listings: moderation "verify" when quality >= 80
//    (housing-moderation-service.act)
//  - travel experiences + packages: moderation "verify" when quality >= 80
//    (admin-travel-oversight-service.moderateExperience / moderatePackage)
// The actor is the first "ZhaoXi Admin" account; REVIEW_NOTE records why.

const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("POSTGRES_URL or DATABASE_URL is required.");

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "data", "danang-stores");
const storeCodes = [
  "ZX-HOME-DN",
  ...readdirSync(dataDir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(join(dataDir, file), "utf8")).org.code),
];
const note = process.env.REVIEW_NOTE || "Approved at the platform owner's request (ZhaoXi-operated store, catalogue reviewed).";
const phone = process.env.STORE_PHONE || null;

const obj = (value) => (typeof value === "string" ? JSON.parse(value || "{}") : value || {});
const daysSince = (value) => { const t = new Date(String(value || "")).getTime(); return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86400000)) : 999; };
const activeBadge = (b) => b.status === "active" && (!b.expiresAt || new Date(b.expiresAt).getTime() > Date.now());

// Mirrors housing-moderation-service quality().
function housingQuality(row, m) {
  let score = 100;
  const gallery = Array.isArray(m.galleryUrls) ? m.galleryUrls.filter(Boolean) : [];
  if (!row.name) score -= 20;
  if (!row.summary && !row.description) score -= 10;
  if (!m.imageUrl) score -= 20;
  if (gallery.length < 3) score -= 10;
  if (!m.propertyType) score -= 10;
  if (!m.district) score -= 10;
  if (!m.propertyAddress) score -= 10;
  if (Number(row.price_from || 0) <= 0) score -= 20;
  if (Number(m.areaSqm || 0) <= 0) score -= 5;
  const stale = daysSince(row.updated_at || m.inventoryUpdatedAt);
  if (stale > 60) score -= 15; else if (stale > 30) score -= 8;
  return score;
}

// Mirrors admin-travel-oversight-service quality().
function travelQuality(row, m) {
  let score = 100;
  const pkgs = Array.isArray(m.travelPackages) ? m.travelPackages : [];
  const gallery = Array.isArray(m.galleryUrls) ? m.galleryUrls.filter(Boolean) : [];
  if (!row.name) score -= 20;
  if (!row.summary && !row.description) score -= 10;
  if (!m.imageUrl) score -= 15;
  if (gallery.length < 3) score -= 8;
  if (!m.destination) score -= 12;
  if (!m.experienceType) score -= 8;
  if (!m.duration) score -= 6;
  if (!m.departurePoint) score -= 8;
  if (!Array.isArray(m.startTimes) && !m.startTime) score -= 8;
  if (!pkgs.length) score -= 20;
  if (pkgs.some((p) => Number(p.maxGuests) < Number(p.minGuests))) score -= 10;
  if (pkgs.some((p) => (p.pricingMode === "group" ? Number(p.groupPrice) : Number(p.adultPrice)) <= 0)) score -= 15;
  return score;
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

try {
  const [admin] = await sql`select u.id from user_roles r join users u on u.id = r.user_id where r.role = 'admin' order by u.created_at limit 1`;
  if (!admin) throw new Error("No admin account found.");
  const audit = (area, action, targetType, targetId, beforeState, afterState, metadata = {}) => sql`
    insert into operations_audit_logs (actor_type, actor_user_id, area, action, target_type, target_id, before_state, after_state, metadata)
    values ('admin', ${admin.id}, ${area}, ${action}, ${targetType}, ${targetId}, ${beforeState === null ? null : sql.json(beforeState)}, ${sql.json(afterState)}, ${sql.json({ note, ...metadata })})
  `;

  const report = [];
  for (const code of storeCodes) {
    const [org] = await sql`select id, name, phone, metadata from organizations where code = ${code}`;
    if (!org) { report.push({ code, skipped: "store not found" }); continue; }
    const now = new Date().toISOString();
    const meta = obj(org.metadata);
    const badges = Array.isArray(meta.partnerTrustBadges) ? meta.partnerTrustBadges : [];
    let badgeIssued = false;
    if (!badges.some((b) => b.type === "verified_partner" && activeBadge(b))) {
      const badge = { id: crypto.randomUUID(), type: "verified_partner", status: "active", reason: note, evidenceReference: `scripts/approve-danang-stores.mjs ${now.slice(0, 10)}`, issuedAt: now, issuedBy: admin.id, expiresAt: null, revokedAt: null, revokedBy: null, revokeReason: null, manualCertification: true };
      meta.partnerTrustBadges = [...badges, badge].slice(-100);
      await audit("partner_trust_governance", "badge_issued", "organization", org.id, null, badge, { manualCertificationOnly: true, trustScoreDoesNotAutoGrant: true, noAutomaticFeeChange: true, noFundControl: true, noRankingChange: true });
      badgeIssued = true;
    }
    meta.verified = true;
    await sql`update organizations set phone = coalesce(${phone}, phone), metadata = ${sql.json(meta)}, updated_at = now() where id = ${org.id}`;

    const rows = await sql`
      select s.id, s.price_from, s.updated_at, s.is_enabled, s.metadata, md.code as module, t.name, t.summary, t.description
      from services s join modules md on md.id = s.module_id
      left join service_translations t on t.service_id = s.id and t.locale = 'zh-CN'
      where s.organization_id = ${org.id} and s.is_enabled = true
    `;
    let verified = 0;
    const lowQuality = [];
    for (const row of rows) {
      const m = obj(row.metadata);
      if (row.module === "housing") {
        const score = housingQuality(row, m);
        if (score < 80 || m.adminHidden === true) { lowQuality.push({ id: row.id, score }); continue; }
        if (m.adminVerified === true) { verified++; continue; }
        const next = { ...m, adminReviewedAt: now, adminReviewedBy: admin.id, adminReviewNote: note, moderationStatus: "verified", adminVerified: true, adminVerifiedAt: now };
        await sql`update services set metadata = ${sql.json(next)}, updated_at = now() where id = ${row.id}`;
        await audit("housing_moderation", "verify", "service", row.id, { isEnabled: row.is_enabled, metadata: m }, { isEnabled: row.is_enabled, metadata: next });
        verified++;
      } else if (row.module === "travel") {
        const score = travelQuality(row, m);
        if (score < 80 || m.travelAdminHidden === true) { lowQuality.push({ id: row.id, score }); continue; }
        const pkgs = (Array.isArray(m.travelPackages) ? m.travelPackages : []).map((p) => {
          const price = p.pricingMode === "group" ? Number(p.groupPrice) : Number(p.adultPrice);
          return price > 0 && Number(p.maxGuests) >= Number(p.minGuests) && !p.adminHidden
            ? { ...p, adminVerified: true, adminReviewedAt: now, adminReviewedBy: admin.id, adminReviewNote: note }
            : p;
        });
        const next = { ...m, travelPackages: pkgs, travelAdminReviewedAt: now, travelAdminReviewedBy: admin.id, travelAdminReviewNote: note, travelModerationStatus: "verified", travelAdminVerified: true, travelAdminVerifiedAt: now };
        await sql`update services set metadata = ${sql.json(next)}, updated_at = now() where id = ${row.id}`;
        await audit("travel_moderation", "verify", "service", row.id, { isEnabled: row.is_enabled, metadata: m }, { isEnabled: row.is_enabled, metadata: next });
        verified++;
      }
    }
    report.push({ code, store: org.name, badgeIssued, listingsVerified: verified, lowQuality });
  }
  console.log(JSON.stringify({ actor: admin.id, phone, report }, null, 2));
} finally {
  await sql.end();
}
