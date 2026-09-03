export type SecurityRole = "customer" | "partner" | "admin" | "driver";

export type SecurityActor = {
  role: SecurityRole;
  userId: string;
};

export type RequestSecurityResource = {
  customerId: string | null;
  assignedOrganizationId: string | null;
};

export type RequestSecurityContext = {
  hasOrganizationMembership?: boolean;
  isAssignedDriver?: boolean;
};

export function canManageOrganization(actor: SecurityActor, hasOrganizationMembership: boolean) {
  return actor.role === "admin" || (actor.role === "partner" && hasOrganizationMembership);
}

export function canAccessRequest(
  actor: SecurityActor,
  resource: RequestSecurityResource,
  context: RequestSecurityContext = {},
) {
  if (actor.role === "admin") return true;
  if (actor.role === "customer") return Boolean(resource.customerId && resource.customerId === actor.userId);
  if (actor.role === "partner") {
    return Boolean(resource.assignedOrganizationId && context.hasOrganizationMembership);
  }
  if (actor.role === "driver") return context.isAssignedDriver === true;
  return false;
}

export function canAssignRequest(actor: SecurityActor) {
  return actor.role === "admin";
}

export function canManageRequestStatus(
  actor: SecurityActor,
  resource: RequestSecurityResource,
  context: RequestSecurityContext = {},
) {
  if (actor.role === "admin") return true;
  return actor.role === "partner" && Boolean(resource.assignedOrganizationId && context.hasOrganizationMembership);
}

export function canAccessSupportConversation(
  actor: SecurityActor,
  resource: { userId: string | null; organizationId: string | null },
  hasOrganizationMembership: boolean,
) {
  if (actor.role === "admin") return true;
  if (resource.userId && resource.userId === actor.userId) return true;
  return actor.role === "partner" && Boolean(resource.organizationId && hasOrganizationMembership);
}

export function canUpdatePaymentStatus(
  actor: SecurityActor,
  requestAllowed: boolean,
  nextStatus: string,
) {
  if (!requestAllowed) return false;
  if (actor.role === "admin" || actor.role === "partner") return true;
  return actor.role === "driver" && nextStatus === "cash_collected";
}
