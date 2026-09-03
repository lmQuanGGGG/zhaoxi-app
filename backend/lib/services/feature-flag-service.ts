import crypto from "node:crypto";
import {desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {featureFlags} from "@/db/schema";
import {operationsAuditService} from "@/lib/services/operations-audit-service";

const CHANNELS=new Set(["stable","beta","canary"]);
const ROLES=new Set(["customer","partner","driver","admin"]);
function arr(v:unknown,allowed:Set<string>){return Array.isArray(v)?v.map(String).filter(x=>allowed.has(x)):[]}
function clean(v:unknown,n=500){const s=String(v??"").trim();return s?s.slice(0,n):null}
function percent(v:unknown){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):100}
function bucket(subject:string,key:string){const h=crypto.createHash("sha256").update(`${subject}:${key}`).digest();return h.readUInt32BE(0)%100}

export class FeatureFlagService{
  async list(){return getDb().select().from(featureFlags).orderBy(desc(featureFlags.updatedAt))}
  async create(input:any,adminId:string){
    const key=String(input.key||"").trim().toLowerCase().replace(/[^a-z0-9_.-]+/g,"-").slice(0,120);
    if(!key)throw new Error("FEATURE_KEY_REQUIRED");
    const channels=arr(input.channels,CHANNELS);const roles=arr(input.roles,ROLES);
    const [row]=await getDb().insert(featureFlags).values({
      key,name:clean(input.name,180)||key,description:clean(input.description,1000)||undefined,
      enabled:Boolean(input.enabled),killSwitch:Boolean(input.killSwitch),
      channels:channels.length?channels:["beta"],roles:roles.length?roles:["customer","partner","driver","admin"],
      rolloutPercent:percent(input.rolloutPercent),metadata:typeof input.metadata==="object"&&input.metadata?input.metadata:{},
      createdBy:adminId,updatedBy:adminId,updatedAt:new Date()
    }).returning();await operationsAuditService.log({actorUserId:adminId,area:"feature-flags",action:"feature-flag.create",targetType:"feature-flag",targetId:row.id,afterState:row});return row
  }
  async update(id:string,input:any,adminId:string){
    const values:any={updatedBy:adminId,updatedAt:new Date()};
    if(input.name!==undefined)values.name=clean(input.name,180);
    if(input.description!==undefined)values.description=clean(input.description,1000);
    if(input.enabled!==undefined)values.enabled=Boolean(input.enabled);
    if(input.killSwitch!==undefined)values.killSwitch=Boolean(input.killSwitch);
    if(input.rolloutPercent!==undefined)values.rolloutPercent=percent(input.rolloutPercent);
    if(input.channels!==undefined){const v=arr(input.channels,CHANNELS);values.channels=v}
    if(input.roles!==undefined){const v=arr(input.roles,ROLES);values.roles=v}
    const before=(await getDb().select().from(featureFlags).where(eq(featureFlags.id,id)).limit(1))[0]||null;
    const [row]=await getDb().update(featureFlags).set(values).where(eq(featureFlags.id,id)).returning();
    if(!row)throw new Error("FEATURE_FLAG_NOT_FOUND");await operationsAuditService.log({actorUserId:adminId,area:"feature-flags",action:"feature-flag.update",targetType:"feature-flag",targetId:id,beforeState:before,afterState:row});return row
  }
  async snapshot(input:{channel:string;role:string;subject:string}){
    const channel=CHANNELS.has(input.channel)?input.channel:"beta";
    const role=ROLES.has(input.role)?input.role:"customer";
    const rows=await this.list();
    const flags:Record<string,boolean>={};
    for(const f of rows){
      const channelAllowed=Array.isArray(f.channels)&&f.channels.includes(channel);
      const roleAllowed=Array.isArray(f.roles)&&f.roles.includes(role);
      const inRollout=bucket(input.subject||"anonymous",f.key)<Math.max(0,Math.min(100,f.rolloutPercent));
      flags[f.key]=Boolean(f.enabled&&!f.killSwitch&&channelAllowed&&roleAllowed&&inRollout);
    }
    return {channel,role,flags,updatedAt:new Date().toISOString()}
  }
}
export const featureFlagService=new FeatureFlagService();
