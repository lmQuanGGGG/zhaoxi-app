import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { miniappReleases, miniapps, operationsAuditLogs, organizationMembers, organizations, userRoles, users, type MiniAppLocalizedText } from "@/db/schema";
import { collectBuilds, type UploadedFile } from "@/lib/miniapps/archive";
import { bundleStore, storeFor, type BundleLocation } from "@/lib/miniapps/bundle-store";
import { MiniAppManifestError, MINIAPP_PLATFORMS, verifyRelease, type MiniAppPlatform } from "@/lib/miniapps/manifest";

export type MiniAppAudience = "members" | "partner" | "internal";
export type MiniAppReleaseStatus = "draft" | "published" | "rolled_back";

const LOCALES = ["vi-VN", "en-US", "zh-CN", "zh-TW"] as const;
const AUDIENCES: readonly MiniAppAudience[] = ["members", "partner", "internal"];
const AUDIT_AREA = "miniapp_registry";

export class MiniAppRegistryError extends Error {
  constructor(readonly code: string, readonly status: number, message = code) {
    super(message);
    this.name = "MiniAppRegistryError";
  }
}

/** Release columns without the bundle bytes. */
const releaseColumns = {
  id: miniappReleases.id,
  miniappId: miniappReleases.miniappId,
  platform: miniappReleases.platform,
  version: miniappReleases.version,
  runtime: miniappReleases.runtime,
  manifest: miniappReleases.manifest,
  sha256: miniappReleases.sha256,
  sizeBytes: miniappReleases.sizeBytes,
  keyId: miniappReleases.keyId,
  bundleFile: miniappReleases.bundleFile,
  storage: miniappReleases.storage,
  status: miniappReleases.status,
  rolloutPercent: miniappReleases.rolloutPercent,
  notes: miniappReleases.notes,
  createdBy: miniappReleases.createdBy,
  createdAt: miniappReleases.createdAt,
  publishedBy: miniappReleases.publishedBy,
  publishedAt: miniappReleases.publishedAt,
  rolledBackBy: miniappReleases.rolledBackBy,
  rolledBackAt: miniappReleases.rolledBackAt,
  rollbackReason: miniappReleases.rollbackReason,
};
type ReleaseRow = Omit<typeof miniappReleases.$inferSelect, "bundleData" | "storageKey">;
type LiveRelease = Pick<ReleaseRow, "id" | "version" | "rolloutPercent" | "publishedAt" | "sha256">;

/** Stable 0–99 bucket per (mini app, user): raising the rollout keeps everyone already in. */
export function rolloutBucket(miniappId: string, userKey: string) {
  return createHash("sha256").update(`${miniappId}:${userKey}`).digest().readUInt32BE(0) % 100;
}

/**
 * The release a user gets: the newest published release whose rollout covers them. A partial
 * rollout sits on top of the previous full one, so users outside it fall through to that.
 * Without a user key only full (100 %) releases count.
 */
export function pickLiveRelease<T extends Pick<LiveRelease, "rolloutPercent" | "publishedAt">>(published: T[], miniappId: string, userKey: string | null): T | null {
  const ordered = [...published].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  const bucket = userKey ? rolloutBucket(miniappId, userKey) : null;
  return ordered.find((release) => release.rolloutPercent >= 100 || (bucket !== null && bucket < release.rolloutPercent)) ?? null;
}

function cleanText(value: unknown, max: number): MiniAppLocalizedText {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: MiniAppLocalizedText = {};
  for (const locale of LOCALES) {
    const text = String(source[locale] ?? "").trim();
    if (text.length > max) throw new MiniAppRegistryError("MINIAPP_TEXT_TOO_LONG", 422, `${locale} text is longer than ${max} characters`);
    if (text) out[locale] = text;
  }
  return out;
}

async function audienceGroups(userId: string | null): Promise<Set<MiniAppAudience>> {
  const groups = new Set<MiniAppAudience>();
  if (!userId) return groups;
  const db = getDb();
  const [userRows, roles, memberships] = await Promise.all([
    db.select({ isGuest: users.isGuest }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ role: userRoles.role }).from(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true))),
    db.select({ status: organizations.status }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.isActive, true))),
  ]);
  const user = userRows[0];
  if (!user || user.isGuest) return groups;
  groups.add("members");
  const roleNames = new Set(roles.map((row) => row.role));
  // Same rule as the host's access.ts: partner role, or a member of an active store.
  if (roleNames.has("partner") || memberships.some((row) => row.status === "active")) groups.add("partner");
  if (roleNames.has("admin")) groups.add("internal");
  return groups;
}

async function audit(actorUserId: string, action: string, targetType: string, targetId: string, beforeState: unknown, afterState: unknown, metadata: Record<string, unknown> = {}) {
  await getDb().insert(operationsAuditLogs).values({ actorUserId, area: AUDIT_AREA, action, targetType, targetId, beforeState, afterState, metadata });
}

function releaseState(row: Pick<ReleaseRow, "id" | "miniappId" | "platform" | "version" | "status" | "rolloutPercent">) {
  return { id: row.id, miniappId: row.miniappId, platform: row.platform, version: row.version, status: row.status, rolloutPercent: row.rolloutPercent };
}

export class MiniAppRegistryService {
  // -------------------------------------------------------------------------
  // Host
  // -------------------------------------------------------------------------

  /** Catalogue for the host: enabled apps this user may see that have a live release on `platform`. */
  async catalog(userId: string | null, platform: MiniAppPlatform) {
    const db = getDb();
    const [groups, apps] = await Promise.all([
      audienceGroups(userId),
      db.select().from(miniapps).where(eq(miniapps.enabled, true)).orderBy(asc(miniapps.sortOrder), asc(miniapps.id)),
    ]);
    const visible = apps.filter((app) => !app.audience || groups.has(app.audience as MiniAppAudience));
    if (!visible.length) return [];
    const published = await db
      .select({ id: miniappReleases.id, miniappId: miniappReleases.miniappId, version: miniappReleases.version, rolloutPercent: miniappReleases.rolloutPercent, publishedAt: miniappReleases.publishedAt, sha256: miniappReleases.sha256 })
      .from(miniappReleases)
      .where(and(inArray(miniappReleases.miniappId, visible.map((app) => app.id)), eq(miniappReleases.platform, platform), eq(miniappReleases.status, "published")));
    return visible.flatMap((app) => {
      const live = pickLiveRelease(published.filter((row) => row.miniappId === app.id), app.id, userId);
      if (!live) return [];
      return [{ id: app.id, title: app.title, subtitle: app.subtitle, icon: app.icon, tint: app.tint, chrome: app.chrome, audience: app.audience, release: { platform, version: live.version, sha256: live.sha256 } }];
    });
  }

  /**
   * Manifest for `/miniapps/<id>/<platform>/manifest.json[?v=<version>]`. `v` (from the catalogue)
   * selects a published release; if it was rolled back meanwhile the stable release is served instead,
   * so a rollback reaches hosts with an old catalogue too.
   */
  async manifest(miniappId: string, platform: MiniAppPlatform, version: string | null) {
    const db = getDb();
    const [app] = await db.select({ enabled: miniapps.enabled }).from(miniapps).where(eq(miniapps.id, miniappId)).limit(1);
    if (!app?.enabled) return null;
    const published = await db
      .select({ version: miniappReleases.version, rolloutPercent: miniappReleases.rolloutPercent, publishedAt: miniappReleases.publishedAt, manifest: miniappReleases.manifest })
      .from(miniappReleases)
      .where(and(eq(miniappReleases.miniappId, miniappId), eq(miniappReleases.platform, platform), eq(miniappReleases.status, "published")));
    const chosen = (version && published.find((row) => row.version === version)) || pickLiveRelease(published, miniappId, null);
    return chosen ? { version: chosen.version, manifest: chosen.manifest } : null;
  }

  /** Bundle bytes (or where to fetch them). Rolled-back builds stay downloadable so in-flight loads finish. */
  async bundle(miniappId: string, platform: MiniAppPlatform, file: string): Promise<BundleLocation | null> {
    const [row] = await getDb()
      .select({ storage: miniappReleases.storage, storageKey: miniappReleases.storageKey, bundleData: miniappReleases.bundleData, enabled: miniapps.enabled })
      .from(miniappReleases)
      .innerJoin(miniapps, eq(miniapps.id, miniappReleases.miniappId))
      .where(and(eq(miniappReleases.miniappId, miniappId), eq(miniappReleases.platform, platform), eq(miniappReleases.bundleFile, file), inArray(miniappReleases.status, ["published", "rolled_back"])))
      .limit(1);
    if (!row?.enabled) return null;
    return storeFor(row.storage)?.locate(row) ?? null;
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  async adminList() {
    const db = getDb();
    const [apps, releases] = await Promise.all([
      db.select().from(miniapps).orderBy(asc(miniapps.sortOrder), asc(miniapps.id)),
      db.select(releaseColumns).from(miniappReleases).orderBy(desc(miniappReleases.createdAt)),
    ]);
    return apps.map((app) => {
      const own = releases.filter((row) => row.miniappId === app.id);
      const live = Object.fromEntries(MINIAPP_PLATFORMS.map((platform) => {
        const published = own.filter((row) => row.platform === platform && row.status === "published");
        const stable = pickLiveRelease(published, app.id, null);
        const newest = [...published].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))[0];
        return [platform, { stable: stable?.version ?? null, rollout: newest && newest.id !== stable?.id ? { version: newest.version, percent: newest.rolloutPercent } : null }];
      }));
      return { ...app, live, releases: own };
    });
  }

  /** Verifies and stores an uploaded `dist/` (files or zip). All platforms in one upload land together or not at all. */
  async upload(adminUserId: string, files: UploadedFile[], notes: string | null) {
    let builds;
    try {
      builds = collectBuilds(files);
      for (const build of builds) verifyRelease(build.manifest, build.bundle);
    } catch (error) {
      if (error instanceof MiniAppManifestError) throw new MiniAppRegistryError(error.code, 422, error.message);
      throw error;
    }
    const { id: miniappId, name, version } = builds[0].manifest;
    const store = bundleStore();
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      const [existingApp] = await tx.select({ id: miniapps.id }).from(miniapps).where(eq(miniapps.id, miniappId)).limit(1);
      let createdApp = false;
      if (!existingApp) {
        // First upload registers the app with the build's name; the admin adjusts text, icon and audience afterwards.
        await tx.insert(miniapps).values({ id: miniappId, title: Object.fromEntries(LOCALES.map((locale) => [locale, name.trim().slice(0, 120)])), createdBy: adminUserId });
        createdApp = true;
      }
      const saved = [];
      for (const build of builds) {
        const [existing] = await tx.select(releaseColumns).from(miniappReleases)
          .where(and(eq(miniappReleases.miniappId, miniappId), eq(miniappReleases.platform, build.platform), eq(miniappReleases.version, version))).limit(1);
        if (existing) {
          // Same bytes and same key: a retry. Same bytes re-signed by another key (dev → prod) is not,
          // or the prod-signed upload would be dropped silently while the dev-signed one stays.
          if (existing.sha256 === build.manifest.sha256.toLowerCase() && existing.keyId === build.manifest.keyId) { saved.push({ release: existing, duplicate: true }); continue; }
          throw new MiniAppRegistryError("RELEASE_VERSION_EXISTS", 409, `${miniappId}@${version} (${build.platform}) already exists with a different bundle or signing key; bump the version`);
        }
        const stored = await store.put({ miniappId, platform: build.platform, file: build.manifest.bundle, data: build.bundle });
        const [release] = await tx.insert(miniappReleases).values({
          miniappId, platform: build.platform, version, runtime: build.manifest.runtime, manifest: build.manifest as unknown as Record<string, unknown>,
          sha256: build.manifest.sha256.toLowerCase(), sizeBytes: build.bundle.length, keyId: build.manifest.keyId, bundleFile: build.manifest.bundle,
          storage: stored.storage, storageKey: stored.storageKey, bundleData: stored.bundleData, status: "draft", notes, createdBy: adminUserId,
        }).returning(releaseColumns);
        saved.push({ release, duplicate: false });
      }
      return { createdApp, saved };
    });
    for (const { release, duplicate } of result.saved) {
      if (!duplicate) await audit(adminUserId, "upload", "miniapp_release", release.id, null, releaseState(release), { sha256: release.sha256, keyId: release.keyId, sizeBytes: release.sizeBytes, createdApp: result.createdApp });
    }
    return { miniappId, version, createdApp: result.createdApp, releases: result.saved.map(({ release, duplicate }) => ({ ...release, duplicate })) };
  }

  async updateApp(adminUserId: string, miniappId: string, input: Record<string, unknown>) {
    const db = getDb();
    const [current] = await db.select().from(miniapps).where(eq(miniapps.id, miniappId)).limit(1);
    if (!current) throw new MiniAppRegistryError("MINIAPP_NOT_FOUND", 404);
    const patch: Partial<typeof miniapps.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = cleanText(input.title, 120);
    if (input.subtitle !== undefined) patch.subtitle = cleanText(input.subtitle, 240);
    if (input.icon !== undefined) {
      const icon = String(input.icon).trim();
      if (!/^[a-z0-9-]{1,80}$/.test(icon)) throw new MiniAppRegistryError("MINIAPP_ICON_INVALID", 422, "icon must be an Ionicons name, e.g. storefront-outline");
      patch.icon = icon;
    }
    if (input.tint !== undefined) {
      const tint = String(input.tint).trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(tint)) throw new MiniAppRegistryError("MINIAPP_TINT_INVALID", 422, "tint must be #RRGGBB");
      patch.tint = tint.toUpperCase();
    }
    if (input.chrome !== undefined) {
      if (input.chrome !== "light" && input.chrome !== "dark") throw new MiniAppRegistryError("MINIAPP_CHROME_INVALID", 422);
      patch.chrome = input.chrome;
    }
    if (input.audience !== undefined) {
      const audience = input.audience === null || input.audience === "" ? null : String(input.audience);
      if (audience !== null && !AUDIENCES.includes(audience as MiniAppAudience)) throw new MiniAppRegistryError("MINIAPP_AUDIENCE_INVALID", 422);
      patch.audience = audience;
    }
    if (input.enabled !== undefined) patch.enabled = input.enabled === true;
    if (input.sortOrder !== undefined) {
      const sortOrder = Number(input.sortOrder);
      if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) throw new MiniAppRegistryError("MINIAPP_SORT_INVALID", 422);
      patch.sortOrder = sortOrder;
    }
    const [updated] = await db.update(miniapps).set(patch).where(eq(miniapps.id, miniappId)).returning();
    const state = (row: typeof current) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "createdAt" && key !== "updatedAt"));
    await audit(adminUserId, input.enabled === false && current.enabled ? "disable" : input.enabled === true && !current.enabled ? "enable" : "update", "miniapp", miniappId, state(current), state(updated));
    return updated;
  }

  /** `publish` (draft or rolled_back → published), `rollout` (change % of a published release), `rollback` (published → rolled_back). */
  async releaseAction(adminUserId: string, releaseId: string, input: { action?: unknown; rolloutPercent?: unknown; reason?: unknown }) {
    const db = getDb();
    const [current] = await db.select(releaseColumns).from(miniappReleases).where(eq(miniappReleases.id, releaseId)).limit(1);
    if (!current) throw new MiniAppRegistryError("RELEASE_NOT_FOUND", 404);
    const reason = String(input.reason ?? "").trim().slice(0, 500);
    const percent = input.rolloutPercent === undefined ? current.rolloutPercent : Number(input.rolloutPercent);
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new MiniAppRegistryError("ROLLOUT_INVALID", 422, "rolloutPercent must be an integer 0–100");
    const now = new Date();
    let patch: Partial<typeof miniappReleases.$inferInsert>;
    let expected: MiniAppReleaseStatus[];
    switch (input.action) {
      case "publish":
        expected = ["draft", "rolled_back"];
        patch = { status: "published", rolloutPercent: percent, publishedAt: now, publishedBy: adminUserId, rolledBackAt: null, rolledBackBy: null, rollbackReason: null };
        break;
      case "rollout":
        expected = ["published"];
        patch = { rolloutPercent: percent };
        break;
      case "rollback":
        expected = ["published"];
        patch = { status: "rolled_back", rolledBackAt: now, rolledBackBy: adminUserId, rollbackReason: reason || null };
        break;
      default:
        throw new MiniAppRegistryError("RELEASE_ACTION_UNSUPPORTED", 422);
    }
    if (!expected.includes(current.status as MiniAppReleaseStatus)) throw new MiniAppRegistryError("RELEASE_STATE_CONFLICT", 409, `cannot ${String(input.action)} a ${current.status} release`);
    // Guard on the status we read so two admins acting at once cannot both win.
    const [updated] = await db.update(miniappReleases).set(patch)
      .where(and(eq(miniappReleases.id, releaseId), eq(miniappReleases.status, current.status)))
      .returning(releaseColumns);
    if (!updated) throw new MiniAppRegistryError("RELEASE_STATE_CONFLICT", 409, "the release changed meanwhile; reload");
    await audit(adminUserId, String(input.action), "miniapp_release", releaseId, releaseState(current), releaseState(updated), reason ? { reason } : {});
    const live = await this.manifest(updated.miniappId, updated.platform as MiniAppPlatform, null);
    return { release: updated, stableVersion: live?.version ?? null };
  }
}

export const miniAppRegistryService = new MiniAppRegistryService();
