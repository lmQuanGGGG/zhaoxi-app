import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { languages } from "@/db/schema";
import { errorResponse, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getDb().select().from(languages).orderBy(asc(languages.sortOrder));
    return json({ ok: true, data: rows });
  } catch (error) {
    console.error(error);
    return errorResponse("Unable to load languages.", 500);
  }
}
