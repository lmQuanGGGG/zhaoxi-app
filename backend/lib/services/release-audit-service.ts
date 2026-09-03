import {and,desc,eq,gte} from "drizzle-orm";
import {getDb} from "@/db";
import {releaseAuditEvents} from "@/db/schema";

type AuditInput={
  actorType?:"user"|"system";
  actorUserId?:string|null;
  action:string;
  resourceType:string;
  resourceId?:string|null;
  app?:string|null;
  beforeState?:Record<string,unknown>|null;
  afterState?:Record<string,unknown>|null;
  metadata?:Record<string,unknown>;
};

function objectOrNull(v:unknown):Record<string,unknown>|null{
  if(!v||typeof v!=="object"||Array.isArray(v))return null;
  return JSON.parse(JSON.stringify(v)) as Record<string,unknown>;
}

export class ReleaseAuditService{
  async record(input:AuditInput){
    const [row]=await getDb().insert(releaseAuditEvents).values({
      actorType:input.actorType||"user",
      actorUserId:input.actorUserId||undefined,
      action:String(input.action).slice(0,100),
      resourceType:String(input.resourceType).slice(0,80),
      resourceId:input.resourceId?String(input.resourceId).slice(0,160):undefined,
      app:input.app?String(input.app).slice(0,24):undefined,
      beforeState:objectOrNull(input.beforeState),
      afterState:objectOrNull(input.afterState),
      metadata:objectOrNull(input.metadata)||{},
    }).returning();
    return row;
  }

  async list(input:{resourceType?:string;app?:string;actorUserId?:string;hours?:number;limit?:number}={}){
    const hours=Math.max(1,Math.min(24*90,Math.round(Number(input.hours)||168)));
    const limit=Math.max(1,Math.min(500,Math.round(Number(input.limit)||100)));
    const filters:any[]=[gte(releaseAuditEvents.createdAt,new Date(Date.now()-hours*60*60*1000))];
    if(input.resourceType)filters.push(eq(releaseAuditEvents.resourceType,input.resourceType));
    if(input.app)filters.push(eq(releaseAuditEvents.app,input.app));
    if(input.actorUserId)filters.push(eq(releaseAuditEvents.actorUserId,input.actorUserId));
    return getDb().select().from(releaseAuditEvents).where(filters.length===1?filters[0]:and(...filters)).orderBy(desc(releaseAuditEvents.createdAt)).limit(limit);
  }
}
export const releaseAuditService=new ReleaseAuditService();
