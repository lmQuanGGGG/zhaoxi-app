import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { orderChatErrorStatus, orderChatService } from "@/lib/services/order-chat-service";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ requestId: string }> };
type Body = { organizationId?: unknown; message?: unknown; clientMessageId?: unknown };

async function partner(request: Request) {
  const session = await authenticatedSession(request);
  return session && session.role === "partner" ? session : null;
}

function fail(message: string, e: unknown) {
  const code = e instanceof Error ? e.message : "ORDER_CHAT_FAILED";
  return failure(message, orderChatErrorStatus(code), undefined, code);
}

export async function GET(request: Request, { params }: Context) {
  const session = await partner(request);
  if (!session) return failure("Partner required.", 403, undefined, "PARTNER_REQUIRED");
  try {
    const { requestId } = await params;
    const organizationId = String(new URL(request.url).searchParams.get("organizationId") || session.organizationId || "");
    return success(await orderChatService.partnerThread(session.userId, organizationId, requestId));
  } catch (e) {
    return fail("Unable to load order chat.", e);
  }
}

export async function POST(request: Request, { params }: Context) {
  const session = await partner(request);
  if (!session) return failure("Partner required.", 403, undefined, "PARTNER_REQUIRED");
  try {
    const { requestId } = await params;
    const body = (await request.json().catch(() => ({}))) as Body;
    const organizationId = String(body.organizationId || session.organizationId || "");
    return success(await orderChatService.partnerSend(session.userId, organizationId, requestId, body.message, body.clientMessageId), { status: 201 });
  } catch (e) {
    return fail("Unable to send order message.", e);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await partner(request);
  if (!session) return failure("Partner required.", 403, undefined, "PARTNER_REQUIRED");
  try {
    const { requestId } = await params;
    const body = (await request.json().catch(() => ({}))) as Body;
    const organizationId = String(body.organizationId || session.organizationId || "");
    return success(await orderChatService.partnerRead(session.userId, organizationId, requestId));
  } catch (e) {
    return fail("Unable to mark order chat read.", e);
  }
}
