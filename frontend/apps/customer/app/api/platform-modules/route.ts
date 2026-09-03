import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") || "zh-CN";
  const base = process.env.ZHAOXI_BACKEND_URL || process.env.NEXT_PUBLIC_ZHAOXI_API_URL || "https://zhaoxi-backend.vercel.app";
  try {
    const response = await fetch(`${base}/api/modules?locale=${encodeURIComponent(locale)}`, { cache: "no-store" });
    if (!response.ok) return Response.json({ modules: [] }, { status: 200 });
    const data = await response.json();
    return Response.json(data);
  } catch {
    return Response.json({ modules: [] }, { status: 200 });
  }
}
