import { failure, success } from "@/lib/core/api-response";
import { resolveWeChatCallbackOrigin } from "@/lib/auth-input";
import { wechatAuthService, type WeChatRole } from "@/lib/services/wechat-auth-service";
export const dynamic = "force-dynamic";
const roles = new Set<WeChatRole>(["customer", "partner", "admin", "driver"]);
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body?.role as WeChatRole;
    if (!roles.has(role)) return failure("Unsupported role.", 422, undefined, "INVALID_ROLE");
    const callbackOrigin = resolveWeChatCallbackOrigin(request.url);
    if (!callbackOrigin) return failure("WeChat login is not configured.", 503, undefined, "WECHAT_NOT_CONFIGURED");
    const session = await wechatAuthService.createQrSession({ role, locale: body?.locale, returnUrl: body?.returnUrl, callbackOrigin });
    return success(session);
  } catch (error) {
    console.error(error);
    return failure("Unable to create WeChat login session.", 500, undefined, "WECHAT_SESSION_CREATE_FAILED");
  }
}
