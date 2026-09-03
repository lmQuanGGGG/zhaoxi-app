import{customerPersonalizedDiscoveryService}from"@/lib/services/customer-personalized-discovery-service";import{customerIntentMemoryService}from"@/lib/services/customer-intent-memory-service";
export class CustomerHomePersonalizationService{
 async feed(userId:string,locale="vi-VN"){
  const[hub,intents]=await Promise.all([customerPersonalizedDiscoveryService.hub(userId,locale),customerIntentMemoryService.shortcuts(userId)]),recent=(hub.recentlyViewed||[])as any[],favorites=(hub.favorites||[])as any[],forYou=(hub.forYou||[])as any[];
  const resume=recent[0]?{service:recent[0].item,viewedAt:recent[0].viewedAt,reason:"recent_view"}:favorites[0]?{service:favorites[0],viewedAt:null,reason:"favorite"}:forYou[0]?{service:forYou[0],viewedAt:null,reason:"recommended"}:null;
  const recentlyPartners=[] as any[],seen=new Set<string>();
  for(const x of recent){const s=x.item;if(!s?.organizationId||seen.has(s.organizationId))continue;seen.add(s.organizationId);recentlyPartners.push({organizationId:s.organizationId,name:s.organizationName,code:s.organizationCode||"",href:`/partners/${s.organizationId}`,lastServiceId:s.id,lastServiceName:s.name,lastViewedAt:x.viewedAt,verifiedBadgeCount:s.verifiedBadgeCount||0});if(recentlyPartners.length>=8)break}
  return{smartResume:resume,intentShortcuts:intents.pinned.length?intents.pinned:intents.recent,favorites:favorites.slice(0,8),recentlyViewed:recent.slice(0,8),forYou:forYou.slice(0,12),recentlyViewedPartners:recentlyPartners,preferenceSummary:hub.preferenceSummary,privacy:hub.privacy,homeFeedPolicy:{customerControlled:true,clearableHistory:true,firstPartyOnly:true,noSensitiveProfiling:true,noExternalTracking:true,noPaidPlacement:true,noInternalTrustScoreBoost:true}}
 }
}
export const customerHomePersonalizationService=new CustomerHomePersonalizationService();
