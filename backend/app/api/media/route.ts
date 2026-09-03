import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets, organizations, services } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { authenticatedSession } from "@/lib/auth-request";
import { mayManageOrganization, requireSession } from "@/lib/security/route-authorization";
export const dynamic = "force-dynamic";
const KINDS = new Set(["logo", "banner", "product", "gallery", "document"]);
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const serviceId = url.searchParams.get("serviceId");
    const kind = url.searchParams.get("kind");
    const published = url.searchParams.get("published");
    const session = await authenticatedSession(request);
    const filters = [];
    if (organizationId) filters.push(eq(mediaAssets.organizationId, organizationId));
    if (serviceId) filters.push(eq(mediaAssets.serviceId, serviceId));
    if (kind) filters.push(eq(mediaAssets.kind, kind));
    if (published === "1" || !session || !["admin", "partner"].includes(session.role)) {
      filters.push(eq(mediaAssets.isPublished, true));
    } else if (session.role === "partner") {
      if (!organizationId || !(await mayManageOrganization(session, organizationId))) {
        return errorResponse("Organization not found.", 404);
      }
    }
    const rows = await getDb().select().from(mediaAssets)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(mediaAssets.sortOrder), asc(mediaAssets.createdAt));
    return json({ ok: true, data: rows });
  } catch (error) { console.error(error); return errorResponse("Unable to load media.", 500); }
}
export async function POST(request: Request) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const body = await request.json() as { organizationId?:string; serviceId?:string; kind?:string; blobUrl?:string; pathname?:string; mimeType?:string; sizeBytes?:number; sortOrder?:number; metadata?:Record<string,unknown> };
    if (!body.organizationId || !body.kind || !body.blobUrl) return errorResponse("organizationId, kind and blobUrl are required.", 400);
    if (!(await mayManageOrganization(gate.session, body.organizationId))) return errorResponse("Organization not found.", 404);
    if (!KINDS.has(body.kind)) return errorResponse("Unsupported media kind.", 400);
    const db = getDb();
    const [org] = await db.select({id:organizations.id}).from(organizations).where(eq(organizations.id, body.organizationId)).limit(1);
    if (!org) return errorResponse("Organization not found.", 404);
    if (body.serviceId) {
      const [service] = await db.select({id:services.id, organizationId:services.organizationId}).from(services).where(eq(services.id, body.serviceId)).limit(1);
      if (!service || service.organizationId !== body.organizationId) return errorResponse("Service does not belong to organization.", 403);
    }
    const [created] = await db.insert(mediaAssets).values({
      organizationId: body.organizationId, serviceId: body.serviceId || null, kind: body.kind, blobUrl: body.blobUrl, pathname: body.pathname,
      mimeType: body.mimeType, sizeBytes: body.sizeBytes, sortOrder: body.sortOrder || 0, isPublished: false, metadata: body.metadata || {},
    }).returning();
    return json({ok:true,data:created},{status:201});
  } catch(error){console.error(error);return errorResponse("Unable to register media.",500)}
}
