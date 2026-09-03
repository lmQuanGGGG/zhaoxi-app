import {asc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {uiAcceptanceItems} from "@/db/schema";

const STATUSES=new Set(["pending","passed","failed","blocked","needs_review"]);
const PRIORITIES=new Set(["critical","high","medium","low"]);
function clean(v:unknown,n=1200){const s=String(v??"").trim();return s?s.slice(0,n):null}

export class UiAcceptanceService{
  async list(){
    const rows=await getDb().select().from(uiAcceptanceItems).orderBy(asc(uiAcceptanceItems.app),asc(uiAcceptanceItems.category),asc(uiAcceptanceItems.createdAt));
    const counts=rows.reduce((a:any,r)=>{a.total++;a[r.status]=(a[r.status]||0)+1;if(r.priority==="critical")a.criticalTotal++;if(r.priority==="critical"&&r.status==="passed")a.criticalPassed++;return a},{total:0,pending:0,passed:0,failed:0,blocked:0,needs_review:0,criticalTotal:0,criticalPassed:0});
    return {items:rows,summary:{...counts,criticalReady:counts.criticalTotal>0&&counts.criticalPassed===counts.criticalTotal}};
  }
  async update(id:string,input:any,adminId:string){
    const values:any={updatedBy:adminId,updatedAt:new Date(),reviewedAt:new Date()};
    if(input.status!==undefined){const status=String(input.status);if(!STATUSES.has(status))throw new Error("INVALID_ACCEPTANCE_STATUS");values.status=status}
    if(input.notes!==undefined)values.notes=clean(input.notes);
    if(input.evidenceUrl!==undefined)values.evidenceUrl=clean(input.evidenceUrl,2000);
    if(input.priority!==undefined){const p=String(input.priority);if(PRIORITIES.has(p))values.priority=p}
    const [row]=await getDb().update(uiAcceptanceItems).set(values).where(eq(uiAcceptanceItems.id,id)).returning();
    if(!row)throw new Error("ACCEPTANCE_ITEM_NOT_FOUND");
    return row;
  }
  async resetFailed(adminId:string){
    const rows=await getDb().select().from(uiAcceptanceItems);
    let count=0;
    for(const r of rows){
      if(["failed","blocked","needs_review"].includes(r.status)){await getDb().update(uiAcceptanceItems).set({status:"pending",notes:null,evidenceUrl:null,updatedBy:adminId,reviewedAt:null,updatedAt:new Date()}).where(eq(uiAcceptanceItems.id,r.id));count++}
    }
    return {resetCount:count};
  }
}
export const uiAcceptanceService=new UiAcceptanceService();
