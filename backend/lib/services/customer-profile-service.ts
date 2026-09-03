import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {customerProfiles,customerSavedAddresses,users} from "@/db/schema";

function clean(v:unknown,n=255){const s=String(v??"").trim();return s?s.slice(0,n):null}
function coord(v:unknown){const n=Number(v);return Number.isFinite(n)?n.toFixed(7):null}
function dateOnly(v:unknown){const s=String(v??"").trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}

export class CustomerProfileService{
  async get(userId:string){
    const db=getDb();
    const user=(await db.select().from(users).where(eq(users.id,userId)).limit(1))[0];
    if(!user)throw new Error("USER_NOT_FOUND");
    const profile=(await db.select().from(customerProfiles).where(eq(customerProfiles.userId,userId)).limit(1))[0]||null;
    const addresses=await db.select().from(customerSavedAddresses).where(eq(customerSavedAddresses.userId,userId)).orderBy(customerSavedAddresses.createdAt);
    return {
      identity:{
        userId:user.id,
        zhaoxiId:`ZX-${user.id.replaceAll("-","").slice(0,10).toUpperCase()}`,
        isGuest:user.isGuest,
        profileCompletedAt:user.profileCompletedAt,
        preferredLocale:user.preferredLocale,
        createdAt:user.createdAt,
      },
      user:{
        displayName:user.nickname||"",
        phone:user.phone||"",
        email:user.email||"",
        avatarUrl:user.avatarUrl||"",
      },
      profile:profile?{
        nationality:profile.nationality||"",
        gender:profile.gender||"",
        birthday:profile.birthday||"",
        cityName:profile.cityName||"",
        addressText:profile.addressText||"",
        latitude:profile.latitude===null?null:Number(profile.latitude),
        longitude:profile.longitude===null?null:Number(profile.longitude),
        whatsapp:profile.whatsapp||"",
        wechatContactId:profile.wechatContactId||"",
        notes:profile.notes||"",
      }:{
        nationality:"",gender:"",birthday:"",cityName:"",addressText:"",
        latitude:null,longitude:null,whatsapp:"",wechatContactId:"",notes:"",
      },
      addresses:addresses.map(x=>({...x,latitude:x.latitude===null?null:Number(x.latitude),longitude:x.longitude===null?null:Number(x.longitude)})),
    };
  }

  async update(userId:string,input:any){
    const db=getDb();
    const userValues:any={updatedAt:new Date()};
    if(input.displayName!==undefined)userValues.nickname=clean(input.displayName,120);
    if(input.phone!==undefined)userValues.phone=clean(input.phone,30);
    if(input.email!==undefined)userValues.email=clean(input.email,255);
    if(input.displayName||input.phone)userValues.profileCompletedAt=new Date();
    if(input.avatarUrl!==undefined)userValues.avatarUrl=clean(input.avatarUrl,2000);
    if(input.preferredLocale!==undefined&&["zh-CN","zh-TW","vi-VN","en-US"].includes(String(input.preferredLocale)))userValues.preferredLocale=String(input.preferredLocale);
    await db.update(users).set(userValues).where(eq(users.id,userId));

    const values={
      userId,
      nationality:clean(input.nationality,80),
      gender:clean(input.gender,24),
      birthday:dateOnly(input.birthday),
      cityName:clean(input.cityName,120),
      addressText:clean(input.addressText,1000),
      latitude:coord(input.latitude),
      longitude:coord(input.longitude),
      whatsapp:clean(input.whatsapp,40),
      wechatContactId:clean(input.wechatContactId,128),
      notes:clean(input.notes,1500),
      updatedAt:new Date(),
    };
    const existing=(await db.select().from(customerProfiles).where(eq(customerProfiles.userId,userId)).limit(1))[0];
    if(existing)await db.update(customerProfiles).set(values).where(eq(customerProfiles.userId,userId));
    else await db.insert(customerProfiles).values(values);

    return this.get(userId);
  }

  async addAddress(userId:string,input:any){
    const db=getDb();
    const addressText=clean(input.addressText,1000);if(!addressText)throw new Error("ADDRESS_REQUIRED");
    const isDefault=Boolean(input.isDefault);
    if(isDefault)await db.update(customerSavedAddresses).set({isDefault:false,updatedAt:new Date()}).where(eq(customerSavedAddresses.userId,userId));
    const [row]=await db.insert(customerSavedAddresses).values({
      userId,label:clean(input.label,80)||"Default",
      recipientName:clean(input.recipientName,120),recipientPhone:clean(input.recipientPhone,30),
      addressText,latitude:coord(input.latitude),longitude:coord(input.longitude),isDefault,
    }).returning();
    return row;
  }

  async setDefault(userId:string,id:string){
    const db=getDb();
    await db.update(customerSavedAddresses).set({isDefault:false,updatedAt:new Date()}).where(eq(customerSavedAddresses.userId,userId));
    const [row]=await db.update(customerSavedAddresses).set({isDefault:true,updatedAt:new Date()}).where(and(eq(customerSavedAddresses.id,id),eq(customerSavedAddresses.userId,userId))).returning();
    if(!row)throw new Error("ADDRESS_NOT_FOUND");
    return row;
  }

  async removeAddress(userId:string,id:string){
    const db=getDb();
    const [row]=await db.delete(customerSavedAddresses).where(and(eq(customerSavedAddresses.id,id),eq(customerSavedAddresses.userId,userId))).returning();
    if(!row)throw new Error("ADDRESS_NOT_FOUND");
    return {id};
  }
}
export const customerProfileService=new CustomerProfileService();
