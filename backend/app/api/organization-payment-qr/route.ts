import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";

export const dynamic = "force-dynamic";

// These QR images were already public in the services response. Serve them once,
// on demand, rather than embedding a copy in every menu row.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response(null, { status: 400 });
  }
  const [row] = await getDb().select({ qr: sql<string>`${organizations.metadata}->>'paymentQrUrl'` })
    .from(organizations).where(eq(organizations.id, id)).limit(1);
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(row?.qr || "");
  if (!match) return new Response(null, { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=0, must-revalidate", "X-Content-Type-Options": "nosniff" },
  });
}
