import { weChatPayV3Service } from "@/lib/services/wechat-pay-v3-service";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    await weChatPayV3Service.handleNotification(request, rawBody);
    return Response.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    console.error("WeChat Pay notification rejected", error);
    return Response.json({ code: "FAIL", message: "签名或业务校验失败" }, { status: 400 });
  }
}
