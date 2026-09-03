import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  deliveryJobs,
  driverProfiles,
  organizationMembers,
  paymentTransactions,
  serviceRequests,
  supportConversations,
} from "@/db/schema";
import { authenticatedSession } from "@/lib/auth-request";
import { failure } from "@/lib/core/api-response";
import type { PublicAuthSession } from "@/lib/services/session-service";
import {
  canAccessRequest,
  canAccessSupportConversation,
  canManageOrganization,
  type SecurityRole,
} from "@/lib/security/access-policy";

type SessionGate =
  | { ok: true; session: PublicAuthSession }
  | { ok: false; response: Response };

export async function requireSession(request: Request, roles?: readonly SecurityRole[]): Promise<SessionGate> {
  const session = await authenticatedSession(request);
  if (!session) {
    return { ok: false, response: failure("Authentication required.", 401, undefined, "AUTH_REQUIRED") };
  }
  if (roles && !roles.includes(session.role)) {
    return { ok: false, response: failure("Access denied.", 403, undefined, "ACCESS_DENIED") };
  }
  return { ok: true, session };
}

export async function hasActiveOrganizationMembership(userId: string, organizationId: string) {
  const membership = (
    await getDb()
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.isActive, true),
        ),
      )
      .limit(1)
  )[0];
  return Boolean(membership);
}

export async function mayManageOrganization(session: PublicAuthSession, organizationId: string) {
  const membership =
    session.role === "partner"
      ? await hasActiveOrganizationMembership(session.userId, organizationId)
      : false;
  return canManageOrganization(session, membership);
}

export async function loadRequestSecurityResource(requestId: string) {
  return (
    await getDb()
      .select({
        id: serviceRequests.id,
        customerId: serviceRequests.customerId,
        assignedOrganizationId: serviceRequests.assignedOrganizationId,
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId))
      .limit(1)
  )[0] ?? null;
}

async function isAssignedDriver(userId: string, requestId: string) {
  const row = (
    await getDb()
      .select({ jobId: deliveryJobs.id })
      .from(deliveryJobs)
      .innerJoin(driverProfiles, eq(deliveryJobs.driverId, driverProfiles.id))
      .where(and(eq(deliveryJobs.requestId, requestId), eq(driverProfiles.userId, userId)))
      .limit(1)
  )[0];
  return Boolean(row);
}

export async function mayAccessRequest(session: PublicAuthSession, requestId: string) {
  const resource = await loadRequestSecurityResource(requestId);
  if (!resource) return { exists: false, allowed: false, resource: null } as const;
  const hasOrganizationMembership =
    session.role === "partner" && resource.assignedOrganizationId
      ? await hasActiveOrganizationMembership(session.userId, resource.assignedOrganizationId)
      : false;
  const driverAssigned = session.role === "driver" ? await isAssignedDriver(session.userId, requestId) : false;
  return {
    exists: true,
    allowed: canAccessRequest(session, resource, { hasOrganizationMembership, isAssignedDriver: driverAssigned }),
    resource,
    hasOrganizationMembership,
    isAssignedDriver: driverAssigned,
  } as const;
}

export async function mayAccessRequestByCode(session: PublicAuthSession, requestCode: string) {
  const row = (
    await getDb()
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.requestCode, requestCode.toUpperCase()))
      .limit(1)
  )[0];
  if (!row) return { exists: false, allowed: false } as const;
  return mayAccessRequest(session, row.id);
}

export async function mayAccessPayment(session: PublicAuthSession, paymentId: string) {
  const payment = (
    await getDb()
      .select({ id: paymentTransactions.id, requestId: paymentTransactions.requestId })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, paymentId))
      .limit(1)
  )[0];
  if (!payment) return { exists: false, allowed: false, payment: null } as const;
  const requestAccess = await mayAccessRequest(session, payment.requestId);
  return { exists: true, allowed: requestAccess.allowed, payment, requestAccess } as const;
}

export async function mayAccessSupportConversation(session: PublicAuthSession, conversationId: string) {
  const conversation = (
    await getDb()
      .select({
        id: supportConversations.id,
        userId: supportConversations.userId,
        organizationId: supportConversations.organizationId,
      })
      .from(supportConversations)
      .where(eq(supportConversations.id, conversationId))
      .limit(1)
  )[0];
  if (!conversation) return { exists: false, allowed: false, conversation: null } as const;
  const membership =
    session.role === "partner" && conversation.organizationId
      ? await hasActiveOrganizationMembership(session.userId, conversation.organizationId)
      : false;
  return {
    exists: true,
    allowed: canAccessSupportConversation(session, conversation, membership),
    conversation,
  } as const;
}
