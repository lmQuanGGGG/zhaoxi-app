import {and,desc,eq,gte} from "drizzle-orm";
import {getDb} from "@/db";
import {releaseAlertPolicies,releaseIncidents} from "@/db/schema";
import {releaseHealthService} from "@/lib/services/release-health-service";
import {operationsAuditService} from "@/lib/services/operations-audit-service";

const METRICS=new Set(["runtimeErrors","criticalErrors","orderFailureRate","paymentFailureRate","openSupport"]);
const SEVERITIES=new Set(["warning","critical"]);
function num(v:unknown,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function key(v:unknown){return String(v||"").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,"-").slice(0,80)}
function compare(value:number,op:string,threshold:number){switch(op){case ">":return value>threshold;case "<=":return value<=threshold;case "<":return value<threshold;case "=":return value===threshold;default:return value>=threshold}}

export class ReleaseAlertService{
 async listPolicies(){return getDb().select().from(releaseAlertPolicies).orderBy(releaseAlertPolicies.createdAt)}
 async createPolicy(input:any,adminId:string){
   const metric=String(input.metric||"");if(!METRICS.has(metric))throw new Error("INVALID_ALERT_METRIC");
   const severity=String(input.severity||"warning");if(!SEVERITIES.has(severity))throw new Error("INVALID_ALERT_SEVERITY");
   const k=key(input.key||metric);if(!k)throw new Error("ALERT_KEY_REQUIRED");
   const [row]=await getDb().insert(releaseAlertPolicies).values({key:k,name:String(input.name||k).slice(0,180),metric,comparator:[">=",">","<","<=","="].includes(String(input.comparator))?String(input.comparator):">=",threshold:String(num(input.threshold,0)),severity,windowMinutes:Math.max(15,Math.min(1440,Math.round(num(input.windowMinutes,60)))),enabled:input.enabled!==false,cooldownMinutes:Math.max(5,Math.min(1440,Math.round(num(input.cooldownMinutes,30)))),createdBy:adminId,updatedBy:adminId,updatedAt:new Date()}).returning();return row
 }
 async updatePolicy(id:string,input:any,adminId:string){
   const values:any={updatedBy:adminId,updatedAt:new Date()};
   if(input.name!==undefined)values.name=String(input.name).slice(0,180);if(input.threshold!==undefined)values.threshold=String(num(input.threshold));if(input.severity!==undefined&&SEVERITIES.has(String(input.severity)))values.severity=String(input.severity);if(input.windowMinutes!==undefined)values.windowMinutes=Math.max(15,Math.min(1440,Math.round(num(input.windowMinutes,60))));if(input.cooldownMinutes!==undefined)values.cooldownMinutes=Math.max(5,Math.min(1440,Math.round(num(input.cooldownMinutes,30))));if(input.enabled!==undefined)values.enabled=Boolean(input.enabled);
   const [row]=await getDb().update(releaseAlertPolicies).set(values).where(eq(releaseAlertPolicies.id,id)).returning();if(!row)throw new Error("ALERT_POLICY_NOT_FOUND");return row
 }
 async listIncidents(){return getDb().select().from(releaseIncidents).orderBy(desc(releaseIncidents.createdAt)).limit(100)}
 async evaluate(){
   const db=getDb();const policies=await db.select().from(releaseAlertPolicies).where(eq(releaseAlertPolicies.enabled,true));const created=[] as any[];
   for(const p of policies){const health=await releaseHealthService.snapshot(p.windowMinutes);const value=num((health.metrics as any)[p.metric]);const threshold=num(p.threshold);if(!compare(value,p.comparator,threshold))continue;const since=new Date(Date.now()-p.cooldownMinutes*60_000);const recent=(await db.select().from(releaseIncidents).where(and(eq(releaseIncidents.policyKey,p.key),gte(releaseIncidents.createdAt,since))).limit(1))[0];if(recent)continue;const [incident]=await db.insert(releaseIncidents).values({policyId:p.id,policyKey:p.key,metric:p.metric,severity:p.severity,status:"open",observedValue:String(value),threshold:String(threshold),windowMinutes:p.windowMinutes,message:`${p.name}: ${p.metric} ${value} ${p.comparator} ${threshold}`,releaseVersion:health.release?.version||undefined,updatedAt:new Date()}).returning();created.push(incident)}
   return {createdCount:created.length,created,timestamp:new Date().toISOString()}
 }
 async setIncidentStatus(id:string,statusValue:unknown,adminId:string){const status=String(statusValue);if(!["open","acknowledged","resolved"].includes(status))throw new Error("INVALID_INCIDENT_STATUS");const before=(await getDb().select().from(releaseIncidents).where(eq(releaseIncidents.id,id)).limit(1))[0]||null;const values:any={status,updatedAt:new Date()};if(status==="acknowledged"){values.acknowledgedBy=adminId;values.acknowledgedAt=new Date()}if(status==="resolved"){values.resolvedBy=adminId;values.resolvedAt=new Date()}const [row]=await getDb().update(releaseIncidents).set(values).where(eq(releaseIncidents.id,id)).returning();if(!row)throw new Error("INCIDENT_NOT_FOUND");await operationsAuditService.log({actorUserId:adminId,area:"incident",action:"incident.status",targetType:"incident",targetId:id,beforeState:before,afterState:row});return row}
}
export const releaseAlertService=new ReleaseAlertService();
