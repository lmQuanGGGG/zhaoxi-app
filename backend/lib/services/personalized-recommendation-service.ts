import {and,desc,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {customerBrowsingHistory,customerFavorites,modules,serviceRequests,services} from "@/db/schema";
import {marketplaceRecommendationService,type MarketplaceRecommendation} from "@/lib/services/marketplace-recommendation-service";

type ReasonCode="favorite"|"recent_view"|"ordered"|"popular"|"new"|"explore";
export type PersonalizedRecommendation=MarketplaceRecommendation&{
  personalizedScore:number;
  reasonCode:ReasonCode;
};

function weightMap(rows:Array<{serviceId:string|null;moduleId:string|null;weight:number}>){
  const service=new Map<string,number>();const module=new Map<string,number>();
  for(const row of rows){
    if(row.serviceId)service.set(row.serviceId,(service.get(row.serviceId)||0)+row.weight);
    if(row.moduleId)module.set(row.moduleId,(module.get(row.moduleId)||0)+row.weight);
  }
  return{service,module};
}

export class PersonalizedRecommendationService{
  async list(userId:string|undefined,locale:string,limit=12,offset=0):Promise<PersonalizedRecommendation[]>{
    const base=await marketplaceRecommendationService.list(locale,30,0);
    if(!userId){
      const general=base.map(item=>({...item,personalizedScore:item.score,reasonCode:(item.isNew?"new":item.usageCount>0?"popular":"explore") as ReasonCode}));
      const safeLimit=Math.max(1,Math.min(30,limit));
      const start=general.length?Math.max(0,offset)%general.length:0;
      return[...general.slice(start),...general.slice(0,start)].slice(0,safeLimit);
    }

    const db=getDb();
    const [favorites,history,orders]=await Promise.all([
      db.select({serviceId:customerFavorites.serviceId,moduleId:services.moduleId})
        .from(customerFavorites).innerJoin(services,eq(customerFavorites.serviceId,services.id))
        .where(eq(customerFavorites.userId,userId)),
      db.select({serviceId:customerBrowsingHistory.serviceId,moduleId:services.moduleId})
        .from(customerBrowsingHistory).innerJoin(services,eq(customerBrowsingHistory.serviceId,services.id))
        .where(eq(customerBrowsingHistory.userId,userId)).orderBy(desc(customerBrowsingHistory.viewedAt)).limit(50),
      db.select({serviceId:serviceRequests.serviceId,moduleId:serviceRequests.moduleId})
        .from(serviceRequests).where(eq(serviceRequests.customerId,userId)).orderBy(desc(serviceRequests.createdAt)).limit(50),
    ]);

    const interests=weightMap([
      ...favorites.map(x=>({...x,weight:180})),
      ...history.map((x,index)=>({...x,weight:Math.max(20,100-index*2)})),
      ...orders.map((x,index)=>({...x,weight:Math.max(50,160-index*3)})),
    ]);

    const moduleByCodeRows=await db.select({id:modules.id,code:modules.code}).from(modules);
    const moduleByCode=new Map(moduleByCodeRows.map(x=>[x.code,x.id]));
    const favoriteIds=new Set(favorites.map(x=>x.serviceId));
    const orderIds=new Set(orders.map(x=>x.serviceId).filter(Boolean) as string[]);
    const recentIds=new Set(history.slice(0,12).map(x=>x.serviceId));

    const ranked=base.map(item=>{
      const moduleId=moduleByCode.get(item.moduleCode)||"";
      const direct=interests.service.get(item.id)||0;
      const moduleScore=moduleId?(interests.module.get(moduleId)||0):0;
      const diversityBoost=item.kind==="module_fallback"?4:0;
      const personalizedScore=item.score+direct*2+moduleScore*.45+diversityBoost;
      let reasonCode:ReasonCode="explore";
      if(favoriteIds.has(item.id))reasonCode="favorite";
      else if(orderIds.has(item.id))reasonCode="ordered";
      else if(recentIds.has(item.id))reasonCode="recent_view";
      else if(item.usageCount>0)reasonCode="popular";
      else if(item.isNew)reasonCode="new";
      return{...item,personalizedScore,reasonCode};
    });

    ranked.sort((a,b)=>b.personalizedScore-a.personalizedScore||b.score-a.score||a.title.localeCompare(b.title));

    // Avoid a feed monopolized by one module while still keeping strongest personalized matches first.
    const diverse:PersonalizedRecommendation[]=[];const perModule=new Map<string,number>();
    for(const item of ranked){
      const used=perModule.get(item.moduleCode)||0;
      if(used>=2)continue;
      diverse.push(item);perModule.set(item.moduleCode,used+1);
    }
    for(const item of ranked)if(!diverse.some(x=>x.id===item.id))diverse.push(item);

    const safeLimit=Math.max(1,Math.min(30,limit));
    const start=diverse.length?Math.max(0,offset)%diverse.length:0;
    return[...diverse.slice(start),...diverse.slice(0,start)].slice(0,safeLimit);
  }
}
export const personalizedRecommendationService=new PersonalizedRecommendationService();
