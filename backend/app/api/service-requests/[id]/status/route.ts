import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceRequests, serviceRequestStatusHistory } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";
import { asObject, optionalString, requiredString, ValidationError } from "@/lib/validation";
import { canManageRequestStatus } from "@/lib/security/access-policy";
import { mayAccessRequest, requireSession } from "@/lib/security/route-authorization";

export const dynamic = "force-dynamic";

type RequestStatus = "new" | "reviewing" | "assigned" | "accepted" | "in_progress" | "waiting_customer" | "completed" | "cancelled" | "rejected";
const allowedStatuses = new Set<RequestStatus>(["new", "reviewing", "assigned", "accepted", "in_progress", "waiting_customer", "completed", "cancelled", "rejected"]);
const transitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["reviewing", "assigned", "accepted", "cancelled", "rejected"],
  reviewing: ["assigned", "accepted", "waiting_customer", "cancelled", "rejected"],
  assigned: ["accepted", "in_progress", "reviewing", "cancelled", "rejected"],
  accepted: ["in_progress", "waiting_customer", "cancelled"],
  in_progress: ["waiting_customer", "completed", "cancelled"],
  waiting_customer: ["in_progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireSession(request, ["admin", "partner"]);
    if (!gate.ok) return gate.response;
    const { id } = await context.params;
    const body = asObject(await request.json());
    const statusValue = requiredString(body, "status", 40);
    if (!allowedStatuses.has(statusValue as RequestStatus)) throw new ValidationError("Unsupported request status.");
    const status = statusValue as RequestStatus;
    const note = optionalString(body, "note", 2000);
    if (body.force === true) return errorResponse("Forced transitions are not available on this route.", 403, { code: "FORCE_TRANSITION_DENIED" });
    const estimatedMinutes = typeof body.estimatedMinutes === "number" && [10,15,20,25,30].includes(body.estimatedMinutes) ? body.estimatedMinutes : undefined;
    const db = getDb();
    const [current] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    if (!current) return errorResponse("Service request not found.", 404);
    const access = await mayAccessRequest(gate.session, id);
    if (!access.exists || !canManageRequestStatus(gate.session, current, access)) {
      return errorResponse("Service request not found.", 404);
    }
    if (current.status === status) return json({ ok: true, data: current });
    if (status === "accepted" && (!current.customerPhone?.trim() || !current.addressText?.trim())) {
      return errorResponse("Customer phone and address are required before accepting this order.", 422);
    }
    if (!transitions[current.status].includes(status)) {
      return errorResponse(`Invalid status transition: ${current.status} -> ${status}.`, 409);
    }

    const now = new Date();
    const currentDetails = (current.details || {}) as Record<string, unknown>;
    const details = estimatedMinutes ? { ...currentDetails, estimatedMinutes, acceptedAt: now.toISOString(), estimatedCompletionAt: new Date(now.getTime() + estimatedMinutes * 60_000).toISOString(), deliveryStage: "preparing" } : currentDetails;
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(serviceRequests)
        .set({ status, details, updatedAt: now })
        .where(and(eq(serviceRequests.id, id), eq(serviceRequests.status, current.status)))
        .returning();

      if (!row) return null;

      await tx.insert(serviceRequestStatusHistory).values({
        requestId: id,
        fromStatus: current.status,
        toStatus: status,
        changedByUserId: gate.session.userId,
        note,
      });

      return row;
    });

    if (!updated) {
      return errorResponse("Service request state changed concurrently. Reload and retry.", 409, { code: "REQUEST_STATE_CONFLICT" });
    }

    return json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 422, error.details);
    console.error(error);
    return errorResponse("Unable to update request status.", 500);
  }
}
