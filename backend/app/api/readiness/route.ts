import { healthService } from "@/lib/services/health-service";
export const dynamic = "force-dynamic";
export async function GET(){const database=await healthService.checkDatabase();return Response.json({ok:database.ok,ready:database.ok,dependencies:{database},timestamp:new Date().toISOString()},{status:database.ok?200:503,headers:{"cache-control":"no-store"}})}
