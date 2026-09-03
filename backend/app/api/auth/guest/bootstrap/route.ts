import {NextResponse} from "next/server";
import {getDb} from "@/db";
import {userRoles,users} from "@/db/schema";
import {trustedDeviceService} from "@/lib/services/trusted-device-service";
import {sessionService} from "@/lib/services/session-service";

export const dynamic="force-dynamic";

export async function POST(r:Request){
  try{
    const body=await r.json().catch(()=>({}));
    const role=(body.role === "partner" ? "partner" : "customer") as "customer" | "partner";
    const trusted=await trustedDeviceService.resolve(body.trustedDeviceToken?String(body.trustedDeviceToken):null);
    let user=trusted?.user;
    let trustedDeviceToken:string|undefined;

    if(!user){
      [user]=await getDb().insert(users).values({
        nickname:"ZhaoXi Guest",
        preferredLocale:String(body.locale||"zh-CN").slice(0,20),
        status:"active",
        isGuest:true,
        guestExpiresAt:trustedDeviceService.guestExpiresAt(),
      }).returning();
      trustedDeviceToken=(await trustedDeviceService.createForUser(user.id)).raw;
    }

    await getDb().insert(userRoles).values({userId:user.id,role,isActive:true}).onConflictDoNothing();
    const issued=await sessionService.issue({
      userId:user.id,role,
      deviceId:body.deviceId?String(body.deviceId).slice(0,180):undefined,
      deviceName:body.deviceName?String(body.deviceName).slice(0,180):undefined,
    });

    return NextResponse.json({ok:true,data:{
      ...issued,
      session:issued.session,
      trustedDeviceToken,
      identityState:user.isGuest?"guest":"persistent",
      reusedIdentity:Boolean(trusted),
    }},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error(error);
    return NextResponse.json({ok:false,error:{code:"GUEST_BOOTSTRAP_FAILED",message:"Unable to start ZhaoXi guest session."}},{status:500});
  }
}
