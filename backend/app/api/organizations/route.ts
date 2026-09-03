import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status")?.trim();
    const type = url.searchParams.get("type")?.trim();
    const filters = [];
    if (status === "active" || status === "pending" || status === "suspended") {
      filters.push(eq(organizations.status, status));
    }
    if (type) filters.push(eq(organizations.type, type));

    const rows = await getDb()
      .select({
        id: organizations.id,
        code: organizations.code,
        type: organizations.type,
        name: organizations.name,
        phone: organizations.phone,
        addressText: organizations.addressText,
        status: organizations.status,
        metadata: organizations.metadata,
      })
      .from(organizations)
      .where(filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters))
      .orderBy(asc(organizations.name));

    return json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load organizations.", 500);
  }
}
