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
} as const;

export class CustomerSupportSettingsService{
 async get(){
   const row=(await getDb().select().from(customerSupportSettings).where(eq(customerSupportSettings.scope,"default")).limit(1))[0];
   return row||DEFAULT_CUSTOMER_SUPPORT_SETTINGS;
 }
 async update(input:any,userId?:string){
   const values={
     scope:"default",
     basicAssistantEnabled:input?.basicAssistantEnabled!==false,
     paidHumanEnabled:input?.paidHumanEnabled!==false,
     paidHumanFee:Math.max(0,Math.min(10_000_000,Math.round(Number(input?.paidHumanFee||0)))),
     paidHumanCurrency:String(input?.paidHumanCurrency||"VND").toUpperCase().slice(0,8),
     emergencyPriority:input?.emergencyPriority!==false,
     updatedByUserId:userId||null,
     updatedAt:new Date(),
   };
   const db=getDb();const existing=(await db.select().from(customerSupportSettings).where(eq(customerSupportSettings.scope,"default")).limit(1))[0];
   if(existing){const[row]=await db.update(customerSupportSettings).set(values).where(eq(customerSupportSettings.id,existing.id)).returning();return row}
   const[row]=await db.insert(customerSupportSettings).values(values).returning();return row;
 }
}
export const customerSupportSettingsService=new CustomerSupportSettingsService();
