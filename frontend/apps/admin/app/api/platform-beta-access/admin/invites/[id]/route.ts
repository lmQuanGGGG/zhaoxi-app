import { NextRequest } from "next/server";

const backend = () =>
  process.env.ZHAOXI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_ZHAOXI_API_URL ||
  "https://zhaoxi-app-puce.vercel.app";

function authHeaders(request: NextRequest): Record<string, string> {
  const accessToken = request.cookies.get("zx_access_v2")?.value;
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...authHeaders(request),
  };

  const response = await fetch(`${backend()}/api/beta-access/admin/invites/${id}`, {
    method: "PATCH",
    headers,
    body: await request.text(),
  });

  return Response.json(await response.json(), { status: response.status });
}
