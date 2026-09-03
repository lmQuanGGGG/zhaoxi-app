import {desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {featureFlags,releaseApprovals,runtimeControls} from "@/db/schema";
import {releaseReadinessService} from "@/lib/services/release-readiness-service";
import {operationsAuditService} from "@/lib/services/operations-audit-service";

function safeNote(v:unknown){const s=String(v??"").trim();return s?s.slice(0,1200):null}

export class ReleaseApprovalService{
  async list(){return getDb().select().from(releaseApprovals).orderBy(desc(releaseApprovals.createdAt)).limit(30)}

  async approve(adminId:string,input:any){
    const readiness=await releaseReadinessService.check();
    if(!readiness.ready)throw new Error("RELEASE_NOT_READY");
    if(input?.openCustomerPublic===true&&!readiness.publicReady)throw new Error("UI_ACCEPTANCE_NOT_READY");
    const db=getDb();
    const runtime=await db.select().from(runtimeControls);
    const flags=await db.select().from(featureFlags);
    const [row]=await db.insert(releaseApprovals).values({
      version:"16.5.0",
      releaseCandidate:"16.5.0-rc",
      status:"approved",
      note:safeNote(input?.note)||undefined,
      snapshot:{runtimeControls:runtime,featureFlags:flags},
      approvedBy:adminId,
      updatedAt:new Date()
    }).returning();
    if(input?.openCustomerPublic===true){
      await db.update(runtimeControls).set({
        accessMode:"public",
        maintenanceEnabled:false,
        updatedBy:adminId,
        updatedAt:new Date()
      }).where(eq(runtimeControls.app,"customer"));
    }
    await operationsAuditService.log({actorUserId:adminId,area:"release",action:"release.approve",targetType:"release",targetId:row.id,afterState:{version:row.version,status:row.status,customerPublic:input?.openCustomerPublic===true}});
    return {release:row,readiness,customerPublic:input?.openCustomerPublic===true};
  }

  async rollback(id:string,adminId:string){
    const db=getDb();
    const row=(await db.select().from(releaseApprovals).where(eq(releaseApprovals.id,id)).limit(1))[0];
    if(!row)throw new Error("RELEASE_NOT_FOUND");
    if(row.status==="rolled_back")throw new Error("RELEASE_ALREADY_ROLLED_BACK");
    const snap=row.snapshot as any;
    await db.transaction(async tx=>{
      for(const r of (snap?.runtimeControls||[])){
        await tx.update(runtimeControls).set({
          accessMode:r.accessMode,
          publicRolloutPercent:r.publicRolloutPercent??100,
          maintenanceEnabled:r.maintenanceEnabled,
          maintenanceMessage:r.maintenanceMessage||{},
          notice:r.notice||{},
          updatedBy:adminId,
          updatedAt:new Date()
        }).where(eq(runtimeControls.app,r.app));
      }
      for(const f of (snap?.featureFlags||[])){
        await tx.update(featureFlags).set({
          enabled:f.enabled,
          killSwitch:f.killSwitch,
          channels:f.channels||[],
          roles:f.roles||[],
          rolloutPercent:f.rolloutPercent,
          metadata:f.metadata||{},
          updatedBy:adminId,
          updatedAt:new Date()
        }).where(eq(featureFlags.id,f.id));
      }
      await tx.update(releaseApprovals).set({
        status:"rolled_back",
        rolledBackBy:adminId,
        rolledBackAt:new Date(),
        updatedAt:new Date()
      }).where(eq(releaseApprovals.id,id));
    });
    await operationsAuditService.log({actorUserId:adminId,area:"release",action:"release.rollback",targetType:"release",targetId:id,beforeState:{status:row.status},afterState:{status:"rolled_back"}});
    return {rolledBack:true,releaseId:id};
  }
}
export const releaseApprovalService=new ReleaseApprovalService();
