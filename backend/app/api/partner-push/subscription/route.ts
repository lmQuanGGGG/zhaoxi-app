import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { partnerPushSubscriptions } from "@/db/schema";
import { authenticatedSession } from "@/lib/auth-request";
import { errorResponse, json } from "@/lib/api";
import { mayManageOrganization } from "@/lib/security/route-authorization";
import { partnerWebPushService } from "@/lib/services/partner-web-push-service";
export const dynamic="force-dynamic";
export async function GET(request:Request){const session=await authenticatedSession(request);if(!session||session.role!=="partner")return errorResponse("Partner required.",401);return json({ok:true,data:{publicKey:partnerWebPushService.publicKey()}})}
export async function POST(request:Request){const session=await authenticatedSession(request);if(!session||session.role!=="partner")return errorResponse("Partner required.",401);const body=await request.json().catch(()=>null);const organizationId=String(body?.organizationId||"");const subscription=body?.subscription;if(!organizationId||!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return errorResponse("Invalid push subscription.",422);if(!(await mayManageOrganization(session,organizationId)))return errorResponse("Organization not found.",404);await getDb().insert(partnerPushSubscriptions).values({userId:session.userId,organizationId,endpoint:String(subscription.endpoint),p256dh:String(subscription.keys.p256dh),auth:String(subscription.keys.auth)}).onConflictDoUpdate({target:partnerPushSubscriptions.endpoint,set:{userId:session.userId,organizationId,p256dh:String(subscription.keys.p256dh),auth:String(subscription.keys.auth),updatedAt:new Date()}});return json({ok:true})}
export async function DELETE(request:Request){const session=await authenticatedSession(request);if(!session||session.role!=="partner")return errorResponse("Partner required.",401);const body=await request.json().catch(()=>null);const endpoint=String(body?.endpoint||"");if(endpoint)await getDb().delete(partnerPushSubscriptions).where(and(eq(partnerPushSubscriptions.userId,session.userId),eq(partnerPushSubscriptions.endpoint,endpoint)));return json({ok:true})}
