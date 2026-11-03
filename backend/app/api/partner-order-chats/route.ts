import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { orderChatErrorStatus, orderChatService } from "@/lib/services/order-chat-service";

export const dynamic = "force-dynamic";

// GET ?organizationId=…            → conversations of the store, newest first
// GET ?organizationId=…&summary=1  → only the unread count (cheap badge poll)
export async function GET(request: Request) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "partner") return failure("Partner required.", 403, undefined, "PARTNER_REQUIRED");
  const params = new URL(request.url).searchParams;
  const organizationId = String(params.get("organizationId") || session.organizationId || "");
  try {
    if (params.get("summary") === "1") return success(await orderChatService.partnerUnread(session.userId, organizationId));
    return success(await orderChatService.partnerThreads(session.userId, organizationId));
  } catch (e) {
    const code = e instanceof Error ? e.message : "ORDER_CHAT_FAILED";
    return failure("Unable to load order chats.", orderChatErrorStatus(code), undefined, code);
  }
}
