import {desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {operationsAuditLogs,releaseAuditEvents} from "@/db/schema";

function safe(value:unknown){try{return JSON.parse(JSON.stringify(value))}catch{return {unserializable:true}}}
function objectOrNull(value:unknown):Record<string,unknown>|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  return safe(value) as Record<string,unknown>;
}
function legacyResource(area:string,action:string,targetType?:string){
  if(action.startsWith("feature-flag."))return "feature_flag";
  if(action==="runtime-control.update")return "runtime_control";
  if(action.startsWith("release."))return "release";
  if(action.startsWith("incident."))return "incident";
  if(action==="rollout-guard.policy.update")return "rollout_guard_policy";
  if(action.startsWith("rollout-guard."))return "runtime_control";
  return targetType||area;
}
function legacyApp(area:string,targetId?:string,metadata?:Record<string,unknown>){
  const explicit=metadata?.app;
  if(typeof explicit==="string"&&explicit)return explicit.slice(0,24);
  if((area==="launch-control"||area==="rollout-guard")&&targetId)return String(targetId).slice(0,24);
  return undefined;
}

export class OperationsAuditService{
  async log(input:{actorType?:"admin"|"system";actorUserId?:string|null;area:string;action:string;targetType?:string;targetId?:string;beforeState?:unknown;afterState?:unknown;metadata?:Record<string,unknown>}){
    const db=getDb();
    const [row]=await db.insert(operationsAuditLogs).values({
      actorType:input.actorType||"admin",
      actorUserId:input.actorUserId||undefined,
      area:String(input.area).slice(0,80),
      action:String(input.action).slice(0,100),
      targetType:input.targetType?String(input.targetType).slice(0,80):undefined,
      targetId:input.targetId?String(input.targetId).slice(0,160):undefined,
      beforeState:input.beforeState===undefined?undefined:safe(input.beforeState),
      afterState:input.afterState===undefined?undefined:safe(input.afterState),
      metadata:input.metadata||{}
    }).returning();

    // Sprint 16.8 compatibility mirror: keep the existing Release Audit Log alive
    // while Sprint 16.9 writes to the new Operations Audit Timeline.
    try{
      await db.insert(releaseAuditEvents).values({
        actorType:input.actorType==="system"?"system":"user",
        actorUserId:input.actorUserId||undefined,
        action:String(input.action).slice(0,100),
        resourceType:String(legacyResource(input.area,input.action,input.targetType)).slice(0,80),
        resourceId:input.targetId?String(input.targetId).slice(0,160):undefined,
        app:legacyApp(input.area,input.targetId,input.metadata),
        beforeState:objectOrNull(input.beforeState),
        afterState:objectOrNull(input.afterState),
        metadata:objectOrNull(input.metadata)||{}
      });
    }catch(error){
      console.error("[operations-audit] legacy release audit mirror failed",error);
    }
    return row;
  }
  async recent(limit=100,area?:string){
    const n=Math.max(1,Math.min(250,Math.round(Number(limit)||100)));
    if(area)return getDb().select().from(operationsAuditLogs).where(eq(operationsAuditLogs.area,area)).orderBy(desc(operationsAuditLogs.createdAt)).limit(n);
    return getDb().select().from(operationsAuditLogs).orderBy(desc(operationsAuditLogs.createdAt)).limit(n);
  }
}
export const operationsAuditService=new OperationsAuditService();
