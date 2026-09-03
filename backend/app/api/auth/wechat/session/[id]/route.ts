import { failure, success } from "@/lib/core/api-response";
import { wechatAuthService } from "@/lib/services/wechat-auth-service";
export const dynamic = "force-dynamic";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await wechatAuthService.getQrSession(id);
    return session ? success(session) : failure("WeChat login session not found.", 404, undefined, "SESSION_NOT_FOUND");
  } catch (error) {
    console.error(error);
    return failure("Unable to read WeChat login session.", 500, undefined, "WECHAT_SESSION_READ_FAILED");
  }
}
