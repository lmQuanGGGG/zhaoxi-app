import { errorResponse, json } from "@/lib/api";
import {
  mayAccessRequestByCode,
  mayAccessSupportConversation,
  mayManageOrganization,
  requireSession,
} from "@/lib/security/route-authorization";
import { supportService } from "@/lib/services/support-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const gate = await requireSession(request);
    if (!gate.ok) return gate.response;
    const conversationId = new URL(request.url).searchParams.get("conversationId");
    if (conversationId) {
      const access = await mayAccessSupportConversation(gate.session, conversationId);
      if (!access.exists || !access.allowed) return errorResponse("Support conversation not found.", 404);
      return json({ ok: true, data: { id: conversationId, messages: await supportService.messages(conversationId) } });
    }
    if (gate.session.role === "partner") {
      if (!gate.session.organizationId || !(await mayManageOrganization(gate.session, gate.session.organizationId))) {
        return errorResponse("Organization not found.", 404);
      }
    }
    const data = gate.session.role === "admin"
      ? await supportService.list()
      : gate.session.role === "partner" && gate.session.organizationId
        ? await supportService.list(undefined, gate.session.organizationId)
        : await supportService.list(gate.session.userId);
    return json({ ok: true, data });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load support conversations.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireSession(request);
    if (!gate.ok) return gate.response;
    const body = await request.json();
    const action = String(body.action || "message");
    if (action === "create") {
      if (gate.session.role === "partner") {
        if (!gate.session.organizationId || !(await mayManageOrganization(gate.session, gate.session.organizationId))) {
          return errorResponse("Organization not found.", 404);
        }
      }
      const row = await supportService.create({
        userId: gate.session.userId,
        organizationId: gate.session.organizationId,
        role: gate.session.role,
        locale: String(body.locale || "vi-VN"),
        subject: String(body.subject || "ZhaoXi Support"),
      });
      return json({ ok: true, data: row }, { status: 201 });
    }
    const conversationId = String(body.conversationId || "");
    if (!conversationId) return errorResponse("conversationId is required", 422);
    const access = await mayAccessSupportConversation(gate.session, conversationId);
    if (!access.exists || !access.allowed) return errorResponse("Support conversation not found.", 404);
    const message = String(body.message || "");
    const orderCode = (message.match(/\bZX[-A-Z0-9]{2,}\b/i) || [])[0];
    const allowOrderContext = orderCode
      ? (await mayAccessRequestByCode(gate.session, orderCode)).allowed
      : false;
    const authorizedMessage = orderCode && !allowOrderContext
      ? message.replace(orderCode, "[ORDER_REDACTED]")
      : message;
    const data = await supportService.respond({
      conversationId,
      message: authorizedMessage,
      locale: String(body.locale || "vi-VN"),
      forceHuman: action === "escalate",
    });
    return json({ ok: true, data });
  } catch (error) {
    console.error(error);
    const code = error instanceof Error ? error.message : "SUPPORT_REQUEST_FAILED";
    if (code === "SUPPORT_CONVERSATION_NOT_FOUND") return errorResponse("Support conversation not found.", 404);
    return errorResponse("Unable to process support request.", 500);
  }
}
