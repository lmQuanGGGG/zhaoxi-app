import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { orderChatErrorStatus, orderChatService, readOrderChatUpload } from "@/lib/services/order-chat-service";

export const dynamic = "force-dynamic";

// POST multipart { file, width?, height? } → a photo to attach to the next message.
// Only order chats take photos.
export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "customer") return failure("Customer required.", 401);
  try {
    const [kind, requestId] = decodeURIComponent((await params).threadId).split(":");
    if (kind !== "order" || !requestId) return failure("Photos are only supported in order chats.", 404, undefined, "ORDER_CHAT_NOT_FOUND");
    return success(await orderChatService.customerUpload(session.userId, requestId, await readOrderChatUpload(request)), { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ATTACHMENT_FAILED";
    return failure("Unable to upload photo.", orderChatErrorStatus(code), undefined, code);
  }
}
