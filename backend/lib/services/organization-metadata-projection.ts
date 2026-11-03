import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";

// Partners may store their bank QR inline as a data: URI (~300 KB). Customer
// read endpoints must not repeat those bytes in every row they return, so the
// projection runs in SQL, before the rows leave the database.

/**
 * Full organization metadata, with an inline payment QR replaced by a URL to
 * /api/organization-payment-qr that serves the image once. Use only on read
 * endpoints whose metadata is never written back; partner editors read the
 * raw value from /api/organizations.
 */
export function publicOrganizationMetadata(requestUrl: string) {
  return sql<Record<string, unknown>>`case
    when ${organizations.metadata}->>'paymentQrUrl' ~ '^data:image/(png|jpeg|webp);base64,'
    then jsonb_set(${organizations.metadata}, '{paymentQrUrl}', to_jsonb(
      ${new URL("/api/organization-payment-qr", requestUrl).href}::text || '?id=' || ${organizations.id}::text
      || '&v=' || md5(${organizations.metadata}->>'paymentQrUrl')
    )) else ${organizations.metadata} end`;
}

/**
 * publicOrganizationMetadata() for every organization matching `where`, keyed by
 * id. The QR check and hash read the whole metadata value, so list endpoints
 * compute it once per organization here instead of once per joined service row
 * (240 rows x 300 KB took ~150 ms of database time), then attach it in JS.
 */
export async function loadPublicOrganizationMetadata(requestUrl: string, where: SQL | undefined) {
  const rows = await getDb()
    .select({ id: organizations.id, metadata: publicOrganizationMetadata(requestUrl) })
    .from(organizations).where(where);
  return new Map(rows.map((row) => [row.id, row.metadata]));
}

/**
 * Only the metadata keys that ranking and card images read: coordinates,
 * banners and logo. For endpoints that never return the metadata itself.
 */
export function organizationCardMetadata() {
  return sql<Record<string, unknown>>`jsonb_strip_nulls(jsonb_build_object(
    'latitude', ${organizations.metadata}->'latitude', 'longitude', ${organizations.metadata}->'longitude',
    'lat', ${organizations.metadata}->'lat', 'lng', ${organizations.metadata}->'lng',
    'bannerUrls', ${organizations.metadata}->'bannerUrls', 'logoUrl', ${organizations.metadata}->'logoUrl'
  ))`;
}
