import { authenticatedSession } from "@/lib/auth-request";
import { failure } from "@/lib/core/api-response";
import { orderChatErrorStatus, orderChatService } from "@/lib/services/order-chat-service";

export const dynamic = "force-dynamic";

// GET → the photo bytes, only for the customer of the order or a member of the
// store it is assigned to (partners may pass ?organizationId=). Photos never
// change, so the viewer's own cache may keep them; shared caches may not.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await authenticatedSession(request);
  if (!session || !["customer", "partner"].includes(session.role)) return failure("Sign in required.", 401);
  try {
    const { id } = await params;
    const organizationId = new URL(request.url).searchParams.get("organizationId") || session.organizationId;
    const photo = await orderChatService.attachment({ userId: session.userId, role: session.role, organizationId }, id);
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "content-type": photo.mimeType,
        "content-length": String(photo.data.length),
        "cache-control": "private, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "content-disposition": "inline",
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ATTACHMENT_FAILED";
    // Someone outside the conversation sees the same answer as for a missing photo.
    const status = orderChatErrorStatus(code);
    return failure("Photo not found.", status === 403 ? 404 : status, undefined, status === 403 ? "ATTACHMENT_NOT_FOUND" : code);
  }
}
