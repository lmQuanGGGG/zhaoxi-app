import { wechatAuthService } from "@/lib/services/wechat-auth-service";
export const dynamic = "force-dynamic";
function page(title: string, message: string, ok: boolean) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;font-family:system-ui;background:#f4f7f5;display:grid;place-items:center;min-height:100vh"><main style="width:min(420px,88vw);background:white;border:1px solid #dce6e0;border-radius:24px;padding:32px;text-align:center;box-shadow:0 18px 50px rgba(15,23,42,.12)"><div style="width:68px;height:68px;border-radius:22px;background:${ok ? "#07c160" : "#ef4444"};color:white;display:grid;place-items:center;margin:0 auto 18px;font-size:34px">${ok ? "✓" : "!"}</div><h1>${title}</h1><p style="color:#637068;line-height:1.6">${message}</p></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const result = await wechatAuthService.confirmFromCallback({ code: url.searchParams.get("code") || undefined, state: url.searchParams.get("state") || undefined });
    return result.ok ? page("ZhaoXi", "WeChat verification completed. Return to ZhaoXi to continue.", true) : page("ZhaoXi", `WeChat verification failed (${result.errorCode}).`, false);
  } catch (error) {
    console.error(error);
    return page("ZhaoXi", "WeChat verification failed. Please retry from ZhaoXi.", false);
  }
}
