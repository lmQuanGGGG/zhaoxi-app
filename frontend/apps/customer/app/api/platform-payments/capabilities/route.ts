export const dynamic = "force-dynamic";

// Payment capability must come from the production payments backend. This
// proxy previously honoured a stale environment URL, which made the checkout
// keep reporting bank transfer as disabled after a partner uploaded a QR.
const backend = () => "https://zhaoxi-app-puce.vercel.app";

export async function GET() {
  try {
    const response = await fetch(`${backend()}/api/payments/capabilities`, { cache: "no-store" });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ ok: false, error: { message: "Backend unavailable" } }, { status: 503 });
  }
}
