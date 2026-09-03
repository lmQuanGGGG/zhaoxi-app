import type { ServiceModuleCode } from "@/lib/core/domain";
export type MarketplaceQuery={module?:ServiceModuleCode;organizationId?:string;locale?:string;publishedOnly?:boolean};
export class MarketplaceService { normalizeQuery(query:MarketplaceQuery):MarketplaceQuery{return {...query,locale:query.locale||"zh-CN",publishedOnly:query.publishedOnly!==false};} }
export const marketplaceService=new MarketplaceService();
