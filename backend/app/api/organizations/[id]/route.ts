import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { mayManageOrganization, requireSession } from "@/lib/security/route-authorization";
import { addressGeocodingService } from "@/lib/services/address-geocoding-service";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const { id } = await context.params;
    if (!(await mayManageOrganization(gate.session, id))) return errorResponse("Organization not found.", 404);
    const body = await request.json() as { name?: string; description?: string; phone?: string; addressText?: string; metadata?: Record<string, unknown> };
    const [current] = await getDb().select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!current) return errorResponse("Organization not found.", 404);
    const addressText = body.addressText?.trim() ?? current.addressText;
    const addressChanged = Boolean(body.addressText?.trim()) && addressText !== current.addressText;
    const geocoded = addressChanged && addressText ? await addressGeocodingService.lookup(addressText) : null;
    const metadata = body.metadata ? { ...(current.metadata || {}), ...body.metadata } : { ...(current.metadata || {}) };
    if (addressChanged) {
      if (geocoded) Object.assign(metadata, {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        geocodedAddress: geocoded.formattedAddress,
        geocodedAt: new Date().toISOString(),
        geocodingStatus: "resolved",
      });
      else Object.assign(metadata, { latitude: null, longitude: null, geocodingStatus: "unresolved" });
    }
    const [updated] = await getDb().update(organizations).set({
      name: body.name?.trim() || current.name,
      description: body.description?.trim() ?? current.description,
      phone: body.phone?.trim() ?? current.phone,
      addressText,
      metadata,
      updatedAt: new Date(),
    }).where(eq(organizations.id, id)).returning();
    return json({ ok: true, data: updated, geocoding: addressChanged ? { status: geocoded ? "resolved" : "unresolved" } : undefined });
  } catch (error) { console.error(error); return errorResponse("Unable to update organization.", 500); }
}
