import {and,eq,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {organizationMembers,organizations,serviceRequests} from "@/db/schema";

export type DayHours={enabled:boolean;open:string;close:string};
export type RestaurantOperationsConfig={
  businessHoursEnabled:boolean;
  timezone:string;
  weeklyHours:Record<string,DayHours>;
  manualPaused:boolean;
  pauseReason:string;
  maxActiveKitchenOrders:number;
  autoPauseWhenCapacity:boolean;
};

const DEFAULT_WEEKLY:Record<string,DayHours>={
  "0":{enabled:true,open:"07:00",close:"22:00"},
  "1":{enabled:true,open:"07:00",close:"22:00"},
  "2":{enabled:true,open:"07:00",close:"22:00"},
  "3":{enabled:true,open:"07:00",close:"22:00"},
  "4":{enabled:true,open:"07:00",close:"22:00"},
  "5":{enabled:true,open:"07:00",close:"22:00"},
  "6":{enabled:true,open:"07:00",close:"22:00"},
};
export const DEFAULT_RESTAURANT_OPERATIONS:RestaurantOperationsConfig={
  businessHoursEnabled:false,
  timezone:"Asia/Ho_Chi_Minh",
  weeklyHours:DEFAULT_WEEKLY,
  manualPaused:false,
  pauseReason:"",
  maxActiveKitchenOrders:30,
  autoPauseWhenCapacity:true,
};

function hhmm(value:unknown,fallback:string){const v=String(value||"");return /^\d{2}:\d{2}$/.test(v)?v:fallback}
function safeTimezone(value:unknown){const candidate=String(value||"Asia/Ho_Chi_Minh").slice(0,64);try{new Intl.DateTimeFormat("en-US",{timeZone:candidate}).format(new Date());return candidate}catch{return"Asia/Ho_Chi_Minh"}}
function normalize(raw:unknown):RestaurantOperationsConfig{
  const v=(raw&&typeof raw==="object"?raw:{}) as any;
  const weekly:Record<string,DayHours>={};
  for(let i=0;i<7;i++){const key=String(i),d=v.weeklyHours?.[key]||{};weekly[key]={enabled:d.enabled!==false,open:hhmm(d.open,"07:00"),close:hhmm(d.close,"22:00")}}
  const max=Number(v.maxActiveKitchenOrders);
  return{
    businessHoursEnabled:v.businessHoursEnabled===true,
    timezone:safeTimezone(v.timezone),
    weeklyHours:weekly,
    manualPaused:v.manualPaused===true,
    pauseReason:String(v.pauseReason||"").slice(0,240),
    maxActiveKitchenOrders:Number.isFinite(max)?Math.max(1,Math.min(200,Math.round(max))):30,
    autoPauseWhenCapacity:v.autoPauseWhenCapacity!==false,
  };
}
function minuteOf(value:string){const[h,m]=value.split(":").map(Number);return h*60+m}
function localParts(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone,weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
  const weekday=parts.find(x=>x.type==="weekday")?.value||"Sun";
  const map:Record<string,string>={Sun:"0",Mon:"1",Tue:"2",Wed:"3",Thu:"4",Fri:"5",Sat:"6"};
  const hour=Number(parts.find(x=>x.type==="hour")?.value||0),minute=Number(parts.find(x=>x.type==="minute")?.value||0);
  return{day:map[weekday]||"0",minutes:hour*60+minute};
}
function withinWeeklyHours(day:string,now:number,weekly:Record<string,DayHours>){
  const today=weekly[day]||{enabled:false,open:"07:00",close:"22:00"};
  if(today.enabled){
    const open=minuteOf(today.open),close=minuteOf(today.close);
    if(open===close)return true;
    if(open<close&&now>=open&&now<close)return true;
    if(open>close&&now>=open)return true;
  }
  const previous=weekly[String((Number(day)+6)%7)];
  if(previous?.enabled){
    const open=minuteOf(previous.open),close=minuteOf(previous.close);
    if(open>close&&now<close)return true;
  }
  return false;
}

export class RestaurantAvailabilityService{
  async getOrganization(organizationId:string){
    const row=(await getDb().select().from(organizations).where(eq(organizations.id,organizationId)).limit(1))[0];
    if(!row)throw new Error("ORGANIZATION_NOT_FOUND");
    const metadata=(row.metadata||{}) as Record<string,unknown>;
    return{row,metadata,config:normalize(metadata.restaurantOperations)};
  }
  async authorize(userId:string,organizationId:string){
    const member=(await getDb().select().from(organizationMembers).where(and(eq(organizationMembers.organizationId,organizationId),eq(organizationMembers.userId,userId),eq(organizationMembers.isActive,true))).limit(1))[0];
    if(!member)throw new Error("PARTNER_FORBIDDEN");
  }
  async activeKitchenCount(organizationId:string){
    const rows=await getDb().select({id:serviceRequests.id,details:serviceRequests.details}).from(serviceRequests)
      .where(and(eq(serviceRequests.assignedOrganizationId,organizationId),inArray(serviceRequests.status,["assigned","accepted","in_progress"]))).limit(250);
    return rows.filter(r=>((r.details||{}) as Record<string,unknown>).deliveryFulfillmentMode==="external_manual").length;
  }
  async status(organizationId:string,at=new Date(),applyCapacity=true){
    const {row,metadata,config}=await this.getOrganization(organizationId);
    const activeKitchenOrders=await this.activeKitchenCount(organizationId);
    const local=localParts(at,config.timezone),hours=config.weeklyHours[local.day]||{enabled:false,open:"07:00",close:"22:00"};
    const withinHours=!config.businessHoursEnabled||withinWeeklyHours(local.day,local.minutes,config.weeklyHours);
    const atCapacity=applyCapacity&&config.autoPauseWhenCapacity&&activeKitchenOrders>=config.maxActiveKitchenOrders;
    const platformRaw=(metadata.platformRestaurantControl&&typeof metadata.platformRestaurantControl==="object"?metadata.platformRestaurantControl:{}) as Record<string,unknown>;
    const platformPaused=platformRaw.paused===true;
    let code:"open"|"platform_paused"|"manual_paused"|"closed_hours"|"at_capacity"="open";
    if(platformPaused)code="platform_paused";else if(config.manualPaused)code="manual_paused";else if(!withinHours)code="closed_hours";else if(atCapacity)code="at_capacity";
    return{
      organizationId:row.id,organizationCode:row.code,open:code==="open",code,
      config,activeKitchenOrders,capacityRemaining:Math.max(0,config.maxActiveKitchenOrders-activeKitchenOrders),
      businessHoursToday:hours,
      platformControl:{paused:platformPaused,reason:String(platformRaw.reason||"").slice(0,240)},
    };
  }
  async update(userId:string,organizationId:string,input:any){
    await this.authorize(userId,organizationId);
    const {row,metadata,config:current}=await this.getOrganization(organizationId);
    const next=normalize({...current,...input,weeklyHours:{...current.weeklyHours,...(input?.weeklyHours||{})}});
    const [updated]=await getDb().update(organizations).set({
      metadata:{...metadata,restaurantOperations:next,restaurantOperationsUpdatedAt:new Date().toISOString()},
      updatedAt:new Date(),
    }).where(eq(organizations.id,row.id)).returning();
    return{organization:updated,config:next,status:await this.status(organizationId)};
  }
}
export const restaurantAvailabilityService=new RestaurantAvailabilityService();
