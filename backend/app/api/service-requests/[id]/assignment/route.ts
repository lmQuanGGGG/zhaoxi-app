import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, serviceRequests, serviceRequestStatusHistory } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { asObject, optionalString, requiredString, ValidationError } from "@/lib/validation";
import { requireSession } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireSession(request, ["admin"]);
    if (!gate.ok) return gate.response;
    const { id } = await context.params;
    const body = asObject(await request.json());
    const organizationId = requiredString(body, "organizationId", 36);
    const note = optionalString(body, "note", 2000) ?? "Assigned by operations";
    const db = getDb();

    const [current] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    if (!current) return errorResponse("Service request not found.", 404);

    const [organization] = await db
      .select({ id: organizations.id, name: organizations.name, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!organization || organization.status !== "active") {
      return errorResponse("Organization is unavailable for assignment.", 422);
    }

    const nextStatus = current.status === "new" || current.status === "reviewing" ? "assigned" : current.status;
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(serviceRequests)
        .set({ assignedOrganizationId: organization.id, status: nextStatus, updatedAt: new Date() })
        .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, current.status)))
        .returning();

      if (!row) return null;

      await tx.insert(serviceRequestStatusHistory).values({
        requestId: id,
        fromStatus: current.status,
        toStatus: nextStatus,
        changedByUserId: gate.session.userId,
        note: `${note}: ${organization.name}`,
      });

      return row;
    });

    if (!updated) {
      return errorResponse("Service request state changed concurrently. Reload and retry.", 409, { code: "REQUEST_STATE_CONFLICT" });
    }

    return json({ ok: true, data: { ...updated, organizationName: organization.name } });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 422, error.details);
    console.error(error);
    return errorResponse("Unable to assign service request.", 500);
  }
}
