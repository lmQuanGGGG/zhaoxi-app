import {featureFlagService} from "@/lib/services/feature-flag-service";
import {operationsAuditService} from "@/lib/services/operations-audit-service";
import {releaseAlertService} from "@/lib/services/release-alert-service";
import {releaseHealthService} from "@/lib/services/release-health-service";
import {releaseReadinessService} from "@/lib/services/release-readiness-service";
import {rolloutGuardService} from "@/lib/services/rollout-guard-service";
import {runtimeControlService} from "@/lib/services/runtime-control-service";
import {uiAcceptanceService} from "@/lib/services/ui-acceptance-service";

export class OperationsCommandCenterService{
  async snapshot(){
    const [readiness,health,incidents,guards,guardEvents,runtime,flags,qa,audit]=await Promise.all([
      releaseReadinessService.check(),
      releaseHealthService.snapshot(60),
      releaseAlertService.listIncidents(),
      rolloutGuardService.listPolicies(),
      rolloutGuardService.recentEvents(),
      runtimeControlService.list(),
      featureFlagService.list(),
      uiAcceptanceService.list(),
      operationsAuditService.recent(40),
    ]);
    const openIncidents=incidents.filter(x=>x.status!=="resolved");
    const criticalIncidents=openIncidents.filter(x=>x.severity==="critical");
    const activeKillSwitches=flags.filter(x=>x.killSwitch);
    const publicApps=runtime.filter(x=>x.accessMode==="public").map(x=>({app:x.app,rolloutPercent:x.publicRolloutPercent??100,maintenanceEnabled:x.maintenanceEnabled}));
    const attention=[
      ...criticalIncidents.slice(0,5).map(x=>({type:"incident",level:"critical",title:x.policyKey,detail:x.message,createdAt:x.createdAt})),
      ...guardEvents.slice(0,5).map(x=>({type:"rollout-guard",level:x.healthStatus==="critical"?"critical":"warning",title:`${x.app}: ${x.previousPercent}% → ${x.nextPercent}%`,detail:x.reason,createdAt:x.createdAt})),
    ];
    return {
      status:health.status,
      ready:readiness.ready,
      publicReady:readiness.publicReady,
      health,
      release:{candidate:readiness.releaseCandidate,channel:readiness.channel},
      summary:{openIncidents:openIncidents.length,criticalIncidents:criticalIncidents.length,activeKillSwitches:activeKillSwitches.length,qaCriticalPassed:qa.summary.criticalPassed,qaCriticalTotal:qa.summary.criticalTotal,auditEvents:audit.length},
      runtime:publicApps,
      guards,
      incidents:openIncidents.slice(0,12),
      attention:attention.slice(0,10),
      audit:audit.slice(0,20),
      timestamp:new Date().toISOString()
    };
  }
}
export const operationsCommandCenterService=new OperationsCommandCenterService();
