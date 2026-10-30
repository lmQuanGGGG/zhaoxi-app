import { failure, success } from "@/lib/core/api-response";
import { requireSession } from "@/lib/security/route-authorization";
import { customerMobilePushService } from "@/lib/services/customer-mobile-push-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Locale = "vi-VN" | "zh-CN" | "zh-TW" | "en-US";
const LOCALES: Locale[] = ["vi-VN", "zh-CN", "zh-TW", "en-US"];

/**
 * Admin-only promotion broadcast to customer app devices that opted in.
 * Body: { copy: { "vi-VN": { title, body }, ... }, url?: "/coupons", userIds?: string[] }
 */
export async function POST(request: Request) {
  const gate = await requireSession(request, ["admin"]);
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null) as { copy?: Record<string, { title?: unknown; body?: unknown }>; url?: unknown; userIds?: unknown } | null;
  const copy: Partial<Record<Locale, { title: string; body: string }>> = {};
  for (const locale of LOCALES) {
    const entry = body?.copy?.[locale];
    const title = String(entry?.title || "").trim().slice(0, 120);
    const text = String(entry?.body || "").trim().slice(0, 240);
    if (title && text) copy[locale] = { title, body: text };
  }
  if (!Object.keys(copy).length) return failure("At least one localized title and body are required.", 422, undefined, "PROMOTION_COPY_REQUIRED");
  const url = typeof body?.url === "string" && body.url.startsWith("/") ? body.url.slice(0, 300) : undefined;
  const userIds = Array.isArray(body?.userIds) ? body.userIds.map(String).slice(0, 5000) : undefined;
  return success(await customerMobilePushService.broadcastPromotion({ copy, url, userIds }));
}
