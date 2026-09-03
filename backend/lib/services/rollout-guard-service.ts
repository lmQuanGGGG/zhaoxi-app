import {desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {rolloutGuardEvents,rolloutGuardPolicies,runtimeControls} from "@/db/schema";
import {releaseHealthService} from "@/lib/services/release-health-service";
import {operationsAuditService} from "@/lib/services/operations-audit-service";

const APPS=new Set(["customer","partner","driver"]);
function app(v:unknown){const x=String(v||"customer");if(!APPS.has(x))throw new Error("ROLLOUT_GUARD_APP_INVALID");return x}
function pct(v:unknown,fallback:number){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback}
function minutes(v:unknown,fallback=60){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(15,Math.min(1440,n)):fallback}

export class RolloutGuardService{
  async listPolicies(){
    const db=getDb();const rows=await db.select().from(rolloutGuardPolicies);
    const out=[] as any[];
    for(const p of rows){
      const control=(await db.select().from(runtimeControls).where(eq(runtimeControls.app,p.app)).limit(1))[0];
      out.push({...p,currentPercent:control?.publicRolloutPercent??100,accessMode:control?.accessMode??"beta"});
    }
    return out;
  }

  async updatePolicy(appValue:unknown,input:any,adminId:string){
    const appName=app(appValue);const db=getDb();
    const current=(await db.select().from(rolloutGuardPolicies).where(eq(rolloutGuardPolicies.app,appName)).limit(1))[0];
    const values={
      app:appName,
      enabled:input.enabled!==undefined?Boolean(input.enabled):Boolean(current?.enabled??true),
      healthWindowMinutes:input.healthWindowMinutes!==undefined?minutes(input.healthWindowMinutes,current?.healthWindowMinutes??60):(current?.healthWindowMinutes??60),
      warningMaxPercent:input.warningMaxPercent!==undefined?pct(input.warningMaxPercent,current?.warningMaxPercent??25):(current?.warningMaxPercent??25),
      criticalFallbackPercent:input.criticalFallbackPercent!==undefined?pct(input.criticalFallbackPercent,current?.criticalFallbackPercent??5):(current?.criticalFallbackPercent??5),
      updatedBy:adminId,updatedAt:new Date()
    };
    if(values.criticalFallbackPercent>values.warningMaxPercent)values.criticalFallbackPercent=values.warningMaxPercent;
    const before=current||null;const [row]=await db.insert(rolloutGuardPolicies).values(values).onConflictDoUpdate({target:rolloutGuardPolicies.app,set:values}).returning();
    await operationsAuditService.log({actorUserId:adminId,area:"rollout-guard",action:"rollout-guard.policy.update",targetType:"app",targetId:appName,beforeState:before,afterState:row});
    return row;
  }

  async assertIncreaseAllowed(appValue:unknown,desiredValue:unknown){
    const appName=app(appValue);const desired=pct(desiredValue,100);const db=getDb();
    const policy=(await db.select().from(rolloutGuardPolicies).where(eq(rolloutGuardPolicies.app,appName)).limit(1))[0];
    if(!policy?.enabled)return {allowed:true,status:"disabled",desired};
    const control=(await db.select().from(runtimeControls).where(eq(runtimeControls.app,appName)).limit(1))[0];
    const current=control?.publicRolloutPercent??100;
    if(desired<=current)return {allowed:true,status:"decrease",desired};
    const health=await releaseHealthService.snapshot(policy.healthWindowMinutes);
    if(health.status==="critical")throw new Error(`ROLLOUT_GUARD_CRITICAL:${policy.criticalFallbackPercent}`);
    if(health.status==="warning"&&desired>policy.warningMaxPercent)throw new Error(`ROLLOUT_GUARD_WARNING:${policy.warningMaxPercent}`);
    return {allowed:true,status:health.status,desired};
  }

  async evaluateAndEnforce(){
    const db=getDb();const policies=await db.select().from(rolloutGuardPolicies).where(eq(rolloutGuardPolicies.enabled,true));const actions=[] as any[];
    for(const policy of policies){
      const control=(await db.select().from(runtimeControls).where(eq(runtimeControls.app,policy.app)).limit(1))[0];
      if(!control||control.accessMode!=="public")continue;
      const health=await releaseHealthService.snapshot(policy.healthWindowMinutes);
      const current=control.publicRolloutPercent??100;
      let next=current;let action="none";let reason=`Health ${health.status}; no rollout change`;
      if(health.status==="critical"&&current>policy.criticalFallbackPercent){next=policy.criticalFallbackPercent;action="auto_reduce_critical";reason=`Critical health reduced rollout ${current}% → ${next}%`;}
      else if(health.status==="warning"&&current>policy.warningMaxPercent){next=policy.warningMaxPercent;action="auto_reduce_warning";reason=`Warning health reduced rollout ${current}% → ${next}%`;}
      if(next!==current){
        await db.update(runtimeControls).set({publicRolloutPercent:next,updatedAt:new Date()}).where(eq(runtimeControls.app,policy.app));
        const [event]=await db.insert(rolloutGuardEvents).values({app:policy.app,healthStatus:health.status,previousPercent:current,nextPercent:next,action,reason}).returning();
        await operationsAuditService.log({actorType:"system",area:"rollout-guard",action,targetType:"app",targetId:policy.app,beforeState:{publicRolloutPercent:current},afterState:{publicRolloutPercent:next},metadata:{healthStatus:health.status,reason}});
        actions.push(event);
      }
    }
    return {evaluated:policies.length,actions,timestamp:new Date().toISOString()};
  }

  async recentEvents(){return getDb().select().from(rolloutGuardEvents).orderBy(desc(rolloutGuardEvents.createdAt)).limit(50)}
}
export const rolloutGuardService=new RolloutGuardService();
