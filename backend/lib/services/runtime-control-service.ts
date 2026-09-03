import crypto from "node:crypto";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {runtimeControls} from "@/db/schema";
import {operationsAuditService} from "@/lib/services/operations-audit-service";

const APPS=new Set(["customer","partner","driver","admin"]);
const MODES=new Set(["closed","beta","public"]);
function app(v:unknown){const x=String(v||"customer");return APPS.has(x)?x:"customer"}
function messages(v:unknown){if(!v||typeof v!=="object"||Array.isArray(v))return {};const out:Record<string,string>={};for(const[k,val]of Object.entries(v as Record<string,unknown>)){if(["zh-CN","zh-TW","vi-VN","en-US"].includes(k)){const s=String(val||"").trim();if(s)out[k]=s.slice(0,600)}}return out}
function pct(v:unknown,fallback=100){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback}
function bucket(appName:string,subject:string){const h=crypto.createHash("sha256").update(`zhaoxi-public-rollout:${appName}:${subject}`).digest();return h.readUInt32BE(0)%100}

export class RuntimeControlService{
  async list(){return getDb().select().from(runtimeControls)}
  async get(appValue:unknown){
    const appName=app(appValue);
    const row=(await getDb().select().from(runtimeControls).where(eq(runtimeControls.app,appName)).limit(1))[0];
    return row||{app:appName,accessMode:"beta",publicRolloutPercent:100,maintenanceEnabled:false,maintenanceMessage:{},notice:{}}
  }
  async evaluate(appValue:unknown,subjectValue:unknown){
    const row=await this.get(appValue);const subject=String(subjectValue||"anonymous").trim().slice(0,200)||"anonymous";
    const percent=pct((row as any).publicRolloutPercent,100);
    const cohortBucket=bucket(row.app,subject);
    const publicEligible=row.accessMode!=="public"||percent>=100||cohortBucket<percent;
    return {...row,publicRolloutPercent:percent,cohortBucket,publicEligible}
  }
  async update(appValue:unknown,input:any,adminId:string){
    const appName=app(appValue);const current=await this.get(appName);
    const accessMode=input.accessMode!==undefined&&MODES.has(String(input.accessMode))?String(input.accessMode):current.accessMode;
    const values={app:appName,accessMode,publicRolloutPercent:input.publicRolloutPercent!==undefined?pct(input.publicRolloutPercent,pct((current as any).publicRolloutPercent,100)):pct((current as any).publicRolloutPercent,100),maintenanceEnabled:input.maintenanceEnabled!==undefined?Boolean(input.maintenanceEnabled):Boolean(current.maintenanceEnabled),maintenanceMessage:input.maintenanceMessage!==undefined?messages(input.maintenanceMessage):(current.maintenanceMessage||{}),notice:input.notice!==undefined?messages(input.notice):(current.notice||{}),updatedBy:adminId,updatedAt:new Date()};
    const [row]=await getDb().insert(runtimeControls).values(values).onConflictDoUpdate({target:runtimeControls.app,set:values}).returning();
    await operationsAuditService.log({actorUserId:adminId,area:"launch-control",action:"runtime-control.update",targetType:"app",targetId:appName,beforeState:current,afterState:row});
    return row
  }
}
export const runtimeControlService=new RuntimeControlService();
