import {sql} from "drizzle-orm";
import {getDb} from "@/db";
import {featureFlags,runtimeControls,uiAcceptanceItems} from "@/db/schema";
import {healthService} from "@/lib/services/health-service";

function envReady(...names:string[]){return names.some(name=>Boolean(process.env[name]?.trim()))}
export class ReleaseReadinessService{
  async check(){
    const database=await healthService.checkDatabase();
    let runtime:any[]=[];let flags:any[]=[];let acceptance:any[]=[];let dbError:string|undefined;
    try{runtime=await getDb().select().from(runtimeControls);flags=await getDb().select().from(featureFlags);acceptance=await getDb().select().from(uiAcceptanceItems)}catch(e){dbError=e instanceof Error?e.message:"DATABASE_QUERY_FAILED"}
    const apps=["customer","partner","driver","admin"];
    const controls=apps.map(app=>{const r=runtime.find(x=>x.app===app);return {app,configured:Boolean(r),accessMode:r?.accessMode||"missing",maintenanceEnabled:Boolean(r?.maintenanceEnabled)}});
    const criticalUi=acceptance.filter(x=>x.priority==="critical");
    const criticalUiPassed=criticalUi.filter(x=>x.status==="passed");
    const uiCriticalReady=criticalUi.length>0&&criticalUiPassed.length===criticalUi.length;
    const checks=[
      {key:"database",label:"Database connectivity",ok:Boolean(database.ok),critical:true,detail:database.ok?"connected":"unavailable"},
      {key:"runtime-controls",label:"Runtime controls configured",ok:controls.every(x=>x.configured),critical:true,detail:controls.map(x=>`${x.app}:${x.accessMode}`).join(", ")},
      {key:"feature-flags",label:"Feature flag registry",ok:flags.length>0,critical:true,detail:`${flags.length} flags`},
      {key:"session-secret",label:"Session signing secret",ok:envReady("ZHAOXI_SESSION_SECRET","AUTH_SESSION_SECRET"),critical:true,detail:"server secret"},
      {key:"wechat-login",label:"WeChat login configuration",ok:envReady("WECHAT_APP_ID")&&envReady("WECHAT_APP_SECRET"),critical:false,detail:"required before WeChat production login"},
      {key:"wechat-pay",label:"WeChat Pay configuration",ok:envReady("WECHAT_PAY_MCH_ID")&&envReady("WECHAT_PAY_PRIVATE_KEY")&&envReady("WECHAT_PAY_API_V3_KEY"),critical:false,detail:"optional until WeChat Pay launch"},
      {key:"public-url",label:"Backend public URL",ok:envReady("ZHAOXI_BACKEND_PUBLIC_URL","VERCEL_PROJECT_PRODUCTION_URL"),critical:false,detail:"callback/public links"},
      {key:"ui-acceptance",label:"Critical UI/UX acceptance",ok:uiCriticalReady,critical:false,publicBlocker:true,detail:`${criticalUiPassed.length}/${criticalUi.length} critical UI checks passed`},
    ];
    const criticalReady=checks.filter(x=>x.critical).every(x=>x.ok);
    const publicReady=criticalReady&&uiCriticalReady;
    const publicApps=controls.filter(x=>x.accessMode==="public").map(x=>x.app);
    return {ready:criticalReady,publicReady,releaseCandidate:"16.5.0-rc",architecture:"foundation-14-locked",channel:process.env.ZHAOXI_RELEASE_CHANNEL||"beta",checks,controls,qa:{criticalReady:uiCriticalReady,criticalPassed:criticalUiPassed.length,criticalTotal:criticalUi.length,failed:acceptance.filter(x=>x.status==="failed").length,blocked:acceptance.filter(x=>x.status==="blocked").length,pending:acceptance.filter(x=>x.status==="pending").length,needsReview:acceptance.filter(x=>x.status==="needs_review").length},summary:{criticalPassed:checks.filter(x=>x.critical&&x.ok).length,criticalTotal:checks.filter(x=>x.critical).length,optionalPassed:checks.filter(x=>!x.critical&&x.ok).length,optionalTotal:checks.filter(x=>!x.critical).length,featureFlags:flags.length,publicApps},databaseError:dbError,timestamp:new Date().toISOString()}
  }
}
export const releaseReadinessService=new ReleaseReadinessService();
