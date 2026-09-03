import { errorResponse, json } from "@/lib/api";
import { localeFromRequest } from "@/lib/locale";
import { marketplaceRecommendationService } from "@/lib/services/marketplace-recommendation-service";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const locale = localeFromRequest(request);
    const limit = Number(url.searchParams.get("limit") || 12);
    const offset = Number(url.searchParams.get("offset") || 0);
    return json({ ok: true, locale, data: await marketplaceRecommendationService.list(locale, limit, offset) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load marketplace recommendations.", 500);
  }
}
