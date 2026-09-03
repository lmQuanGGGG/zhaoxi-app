import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { trustedDeviceIdentities, users } from "@/db/schema";
const COOKIE="zx_trusted_device_v1"; const LONG_DAYS=180; const GUEST_HOURS=24;
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const token=()=>crypto.randomBytes(48).toString("base64url");
export const trustedDeviceCookieName=COOKIE; export const trustedDeviceCookieMaxAge=LONG_DAYS*24*60*60;
export class TrustedDeviceService{
 async resolve(raw?:string|null){if(!raw)return null;const db=getDb();const device=(await db.select().from(trustedDeviceIdentities).where(and(eq(trustedDeviceIdentities.tokenHash,hash(raw)),eq(trustedDeviceIdentities.status,"active"))).limit(1))[0];if(!device||device.expiresAt.getTime()<=Date.now())return null;const user=(await db.select().from(users).where(eq(users.id,device.userId)).limit(1))[0];if(!user||user.status!=="active")return null;if(user.isGuest&&(!user.guestExpiresAt||user.guestExpiresAt.getTime()<=Date.now()))return null;await db.update(trustedDeviceIdentities).set({lastSeenAt:new Date(),updatedAt:new Date()}).where(eq(trustedDeviceIdentities.id,device.id));return{device,user};}
 async createForUser(userId:string){const db=getDb(),raw=token(),now=new Date(),expiresAt=new Date(Date.now()+LONG_DAYS*24*60*60*1000);await db.insert(trustedDeviceIdentities).values({userId,tokenHash:hash(raw),firstSeenAt:now,lastSeenAt:now,expiresAt});return{raw,expiresAt};}
 async promoteUser(userId:string){const db=getDb(),expiresAt=new Date(Date.now()+LONG_DAYS*24*60*60*1000);await db.update(users).set({isGuest:false,profileCompletedAt:new Date(),guestExpiresAt:null,updatedAt:new Date()}).where(eq(users.id,userId));await db.update(trustedDeviceIdentities).set({expiresAt,updatedAt:new Date()}).where(and(eq(trustedDeviceIdentities.userId,userId),eq(trustedDeviceIdentities.status,"active")));}
 guestExpiresAt(){return new Date(Date.now()+GUEST_HOURS*60*60*1000);}
}
export const trustedDeviceService=new TrustedDeviceService();
