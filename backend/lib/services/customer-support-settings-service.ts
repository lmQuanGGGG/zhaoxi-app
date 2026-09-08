import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {customerSupportSettings} from "@/db/schema";

export const DEFAULT_CUSTOMER_SUPPORT_SETTINGS={
  scope:"default",
  basicAssistantEnabled:true,
  paidHumanEnabled:true,
  paidHumanFee:50000,
  paidHumanCurrency:"VND",
  emergencyPriority:true,
  zaloQrUrl:"/support-qr/zalo.png",
  wechatQrUrl:"/support-qr/wechat.png",
  zaloChatUrl:"zalo://",
  wechatChatUrl:"weixin://",
} as const;

const publicUrl=(value:unknown,fallback:string)=>{
 const url=String(value??"").trim();
 return /^(https?:\/\/|\/|zalo:\/\/|weixin:\/\/)/i.test(url)?url.slice(0,2000):fallback;
};

export class CustomerSupportSettingsService{
 async get(){
   const row=(await getDb().select().from(customerSupportSettings).where(eq(customerSupportSettings.scope,"default")).limit(1))[0];
   return row||DEFAULT_CUSTOMER_SUPPORT_SETTINGS;
 }
 async update(input:any,userId?:string){
   const db=getDb();const existing=(await db.select().from(customerSupportSettings).where(eq(customerSupportSettings.scope,"default")).limit(1))[0];
   const current=existing||DEFAULT_CUSTOMER_SUPPORT_SETTINGS;
   const values={
     scope:"default",
     basicAssistantEnabled:input?.basicAssistantEnabled!==false,
     paidHumanEnabled:input?.paidHumanEnabled!==false,
     paidHumanFee:Math.max(0,Math.min(10_000_000,Math.round(Number(input?.paidHumanFee||0)))),
     paidHumanCurrency:String(input?.paidHumanCurrency||"VND").toUpperCase().slice(0,8),
     emergencyPriority:input?.emergencyPriority!==false,
     zaloQrUrl:publicUrl(input?.zaloQrUrl,current.zaloQrUrl||DEFAULT_CUSTOMER_SUPPORT_SETTINGS.zaloQrUrl),
     wechatQrUrl:publicUrl(input?.wechatQrUrl,current.wechatQrUrl||DEFAULT_CUSTOMER_SUPPORT_SETTINGS.wechatQrUrl),
     zaloChatUrl:publicUrl(input?.zaloChatUrl,current.zaloChatUrl||DEFAULT_CUSTOMER_SUPPORT_SETTINGS.zaloChatUrl),
     wechatChatUrl:publicUrl(input?.wechatChatUrl,current.wechatChatUrl||DEFAULT_CUSTOMER_SUPPORT_SETTINGS.wechatChatUrl),
     updatedByUserId:userId||null,
     updatedAt:new Date(),
   };
   if(existing){const[row]=await db.update(customerSupportSettings).set(values).where(eq(customerSupportSettings.id,existing.id)).returning();return row}
   const[row]=await db.insert(customerSupportSettings).values(values).returning();return row;
 }
}
export const customerSupportSettingsService=new CustomerSupportSettingsService();
