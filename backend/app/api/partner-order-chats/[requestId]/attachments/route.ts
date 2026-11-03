import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { orderChatErrorStatus, orderChatService, readOrderChatUpload } from "@/lib/services/order-chat-service";

export const dynamic = "force-dynamic";

// POST multipart { file, width?, height?, organizationId? } → a photo to attach to the next message.
export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const session = await authenticatedSession(request);
  if (!session || session.role !== "partner") return failure("Partner required.", 403, undefined, "PARTNER_REQUIRED");
  try {
    const { requestId } = await params;
    const upload = await readOrderChatUpload(request);
    const organizationId = upload.organizationId || String(session.organizationId || "");
    return success(await orderChatService.partnerUpload(session.userId, organizationId, requestId, upload), { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ATTACHMENT_FAILED";
    return failure("Unable to upload photo.", orderChatErrorStatus(code), undefined, code);
  }
}
