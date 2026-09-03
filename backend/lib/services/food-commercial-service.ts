import {and,eq,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,services} from "@/db/schema";

export type PromotionType="none"|"percent"|"fixed"|"bundle";
export type FoodPromotion={
 enabled:boolean;type:PromotionType;label:string;percentOff:number;fixedPrice:number;
 bundleQty:number;bundlePrice:number;minQty:number;
 startDate:string;endDate:string;startTime:string;endTime:string;weekdays:number[];
};
export type FoodSaleSchedule={
 enabled:boolean;startDate:string;endDate:string;startTime:string;endTime:string;weekdays:number[];
};
export type FoodCommercialConfig={promotion:FoodPromotion;saleSchedule:FoodSaleSchedule;timezone:string};

const promotionDefault:FoodPromotion={enabled:false,type:"none",label:"",percentOff:0,fixedPrice:0,bundleQty:2,bundlePrice:0,minQty:1,startDate:"",endDate:"",startTime:"00:00",endTime:"23:59",weekdays:[0,1,2,3,4,5,6]};
const scheduleDefault:FoodSaleSchedule={enabled:false,startDate:"",endDate:"",startTime:"00:00",endTime:"23:59",weekdays:[0,1,2,3,4,5,6]};
export const DEFAULT_FOOD_COMMERCIAL:FoodCommercialConfig={promotion:promotionDefault,saleSchedule:scheduleDefault,timezone:"Asia/Ho_Chi_Minh"};

function n(v:unknown,fallback=0,min=0,max=100000000){const x=Number(v);return Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback}
function dateString(v:unknown){const s=String(v||"");return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:""}
function timeString(v:unknown,fallback:string){const s=String(v||"");return /^\d{2}:\d{2}$/.test(s)?s:fallback}
function timezone(v:unknown){const s=String(v||"Asia/Ho_Chi_Minh").slice(0,64);try{new Intl.DateTimeFormat("en-US",{timeZone:s}).format(new Date());return s}catch{return"Asia/Ho_Chi_Minh"}}
function weekdays(v:unknown){if(!Array.isArray(v))return[0,1,2,3,4,5,6];const a=[...new Set(v.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))];return a.length?a:[0,1,2,3,4,5,6]}
export function normalizeFoodCommercial(raw:unknown):FoodCommercialConfig{
 const v=(raw&&typeof raw==="object"?raw:{}) as any,p=v.promotion||{},s=v.saleSchedule||{};
 const type=(["none","percent","fixed","bundle"] as string[]).includes(String(p.type))?p.type:"none";
 return{
  timezone:timezone(v.timezone),
  promotion:{enabled:p.enabled===true,type,label:String(p.label||"").slice(0,80),percentOff:n(p.percentOff,0,0,90),fixedPrice:n(p.fixedPrice),bundleQty:Math.round(n(p.bundleQty,2,2,20)),bundlePrice:n(p.bundlePrice),minQty:Math.round(n(p.minQty,1,1,99)),startDate:dateString(p.startDate),endDate:dateString(p.endDate),startTime:timeString(p.startTime,"00:00"),endTime:timeString(p.endTime,"23:59"),weekdays:weekdays(p.weekdays)},
  saleSchedule:{enabled:s.enabled===true,startDate:dateString(s.startDate),endDate:dateString(s.endDate),startTime:timeString(s.startTime,"00:00"),endTime:timeString(s.endTime,"23:59"),weekdays:weekdays(s.weekdays)},
 };
}
function localParts(at:Date,tz:string){const f=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(at);const get=(x:string)=>f.find(p=>p.type===x)?.value||"";const map:Record<string,number>={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};return{date:`${get("year")}-${get("month")}-${get("day")}`,day:map[get("weekday")]??0,time:`${get("hour")}:${get("minute")}`}}
function insideWindow(x:{date:string;day:number;time:string},w:{startDate:string;endDate:string;startTime:string;endTime:string;weekdays:number[]}){
 if(w.startDate&&x.date<w.startDate)return false;if(w.endDate&&x.date>w.endDate)return false;if(!w.weekdays.includes(x.day))return false;
 if(w.startTime<=w.endTime)return x.time>=w.startTime&&x.time<=w.endTime;
 return x.time>=w.startTime||x.time<=w.endTime;
}
export function evaluateFoodCommercial(basePrice:number,quantity:number,raw:unknown,at=new Date()){
 const config=normalizeFoodCommercial(raw),local=localParts(at,config.timezone),scheduledAvailable=!config.saleSchedule.enabled||insideWindow(local,config.saleSchedule);
 const p=config.promotion,requiredQty=p.type==="bundle"?Math.max(p.minQty,p.bundleQty):p.minQty,promoActive=p.enabled&&p.type!=="none"&&quantity>=requiredQty&&insideWindow(local,p);
 let subtotal=basePrice*quantity,discount=0,effectiveUnitPrice=basePrice;
 if(promoActive){
  if(p.type==="percent"){discount=Math.round(subtotal*p.percentOff/100)}
  else if(p.type==="fixed"){effectiveUnitPrice=Math.min(basePrice,p.fixedPrice);discount=Math.max(0,subtotal-effectiveUnitPrice*quantity)}
  else if(p.type==="bundle"&&p.bundleQty>=2&&p.bundlePrice>=0){
    const bundles=Math.floor(quantity/p.bundleQty),remainder=quantity%p.bundleQty;
    const promotedTotal=bundles*p.bundlePrice+remainder*basePrice;discount=Math.max(0,subtotal-promotedTotal);
  }
 }
 const finalSubtotal=Math.max(0,subtotal-discount);
 if(quantity>0)effectiveUnitPrice=finalSubtotal/quantity;
 return{config,scheduledAvailable,promoActive,promotionType:promoActive?p.type:"none",promotionLabel:promoActive?p.label:"",baseUnitPrice:basePrice,effectiveUnitPrice:Number(effectiveUnitPrice.toFixed(2)),quantity,baseSubtotal:subtotal,discount,finalSubtotal};
}

export class FoodCommercialService{
 async authorize(userId:string,serviceId:string){
  const db=getDb(),service=(await db.select().from(services).where(eq(services.id,serviceId)).limit(1))[0];
  if(!service||!service.organizationId)throw new Error("SERVICE_NOT_FOUND");
  const member=(await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,service.organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
  if(!member)throw new Error("PARTNER_FORBIDDEN");return service;
 }
 async update(userId:string,serviceId:string,input:unknown){
  const service=await this.authorize(userId,serviceId),metadata=(service.metadata||{}) as Record<string,unknown>,config=normalizeFoodCommercial(input);
  const[updated]=await getDb().update(services).set({metadata:{...metadata,foodCommercial:config,foodCommercialUpdatedAt:new Date().toISOString()},updatedAt:new Date()}).where(eq(services.id,serviceId)).returning();
  return{service:updated,config};
 }
 async price(serviceIds:string[],quantities:Record<string,number>,at=new Date()){
  const unique=[...new Set(serviceIds)].slice(0,100);if(!unique.length)return[];
  const rows=await getDb().select().from(services).where(inArray(services.id,unique));
  return rows.map(s=>{const quantity=Math.max(1,Math.min(99,Math.round(Number(quantities[s.id]||1))));const metadata=(s.metadata||{}) as any;return{id:s.id,organizationId:s.organizationId,isEnabled:s.isEnabled,isAvailable:metadata.isAvailable!==false,...evaluateFoodCommercial(Number(s.priceFrom||0),quantity,metadata.foodCommercial,at)}})
 }
 async orderPricing(organizationId:string,items:Array<{serviceId:string;quantity:number}>,at=new Date()){
  const ids=[...new Set(items.map(x=>x.serviceId).filter(Boolean))];if(!ids.length)throw new Error("FOOD_ITEMS_REQUIRED");
  const rows=await getDb().select().from(services).where(inArray(services.id,ids));if(rows.length!==ids.length)throw new Error("FOOD_ITEM_NOT_FOUND");
  const byId=new Map(rows.map(x=>[x.id,x]));const lines=[];
  for(const input of items){const s=byId.get(input.serviceId);if(!s||s.organizationId!==organizationId||!s.isEnabled)throw new Error("FOOD_ITEM_INVALID");const metadata=(s.metadata||{}) as any;if(metadata.isAvailable===false)throw new Error("FOOD_ITEM_SOLD_OUT");const q=Math.max(1,Math.min(99,Math.round(Number(input.quantity||1))));const price=evaluateFoodCommercial(Number(s.priceFrom||0),q,metadata.foodCommercial,at);if(!price.scheduledAvailable)throw new Error("FOOD_ITEM_OUTSIDE_SALE_SCHEDULE");lines.push({serviceId:s.id,...price})}
  return{lines,itemBaseSubtotal:lines.reduce((a,x)=>a+x.baseSubtotal,0),itemDiscount:lines.reduce((a,x)=>a+x.discount,0),itemSubtotal:lines.reduce((a,x)=>a+x.finalSubtotal,0)};
 }
}
export const foodCommercialService=new FoodCommercialService();
