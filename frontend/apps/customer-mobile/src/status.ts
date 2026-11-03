export const ACTIVE_STATUSES = new Set(["new", "reviewing", "assigned", "accepted", "in_progress", "waiting_customer"]);
export const CANCELLED_STATUSES = new Set(["cancelled", "rejected"]);

export function statusTone(status: string): "brand" | "warning" | "danger" | "muted" {
  if (CANCELLED_STATUSES.has(status)) return "danger";
  if (status === "completed") return "muted";
  if (status === "waiting_customer") return "warning";
  return "brand";
}
