import { NextRequest } from "next/server";

const backend=()=>((process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"").includes("zhaoxi-backend.vercel.app")?"https://zhaoxi-app-puce.vercel.app":(process.env.ZHAOXI_BACKEND_URL||process.env.NEXT_PUBLIC_ZHAOXI_API_URL||"https://zhaoxi-app-puce.vercel.app")).replace(/\/+$/,"");

function headers(request: NextRequest, json = false) {
  const value: Record<string, string> = {};
  const token = request.cookies.get("zx_access_v2")?.value;
  if (token) value.authorization = `Bearer ${token}`;
  if (json) value["content-type"] = "application/json";
  return value;
}

async function proxy(response: Response) {
  const text = await response.text();
  const body = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { ok: false, error: { code: "INVALID_UPSTREAM_RESPONSE" } };
        }
      })()
    : { ok: false, error: { code: "EMPTY_UPSTREAM_RESPONSE" } };
  return Response.json(body, {
    status: response.ok || text ? response.status : 502,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${backend()}/api/customer-notifications/preferences`, {
      headers: headers(request),
      cache: "no-store",
    });
    return await proxy(response);
  } catch {
    return Response.json({ ok: false, error: { code: "PREFERENCES_UNAVAILABLE" } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const response = await fetch(`${backend()}/api/customer-notifications/preferences`, {
      method: "PATCH",
      headers: headers(request, true),
      body: await request.text(),
      cache: "no-store",
    });
    return await proxy(response);
  } catch {
    return Response.json({ ok: false, error: { code: "PREFERENCES_UNAVAILABLE" } }, { status: 503 });
  }
}
