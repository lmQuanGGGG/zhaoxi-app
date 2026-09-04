import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const backend = () =>
  process.env.ZHAOXI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_ZHAOXI_API_URL ||
  "https://zhaoxi-app-puce.vercel.app";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams);
  try {
    const response = await fetch(`${backend()}/api/services?${params.toString()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    const data = await response.json();
    return Response.json(data, {
      status: response.ok ? 200 : response.status,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
        "cdn-cache-control": "no-store",
        "vercel-cdn-cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { ok: false, data: [], error: "Backend unavailable" },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
