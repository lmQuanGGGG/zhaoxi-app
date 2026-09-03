export type WorkspaceRole="customer"|"partner"|"admin";
export type WorkspaceDevice="phone"|"tablet"|"desktop";
export type WorkspacePageMeta={page:number;pageSize:number;total:number;hasNext:boolean};
export type WorkspaceFilter={key:string;label:string;type:"select"|"search"|"date"|"status";options?:Array<{value:string;label:string}>};
export type WorkspaceAction={key:string;label:string;tone?:"primary"|"neutral"|"danger";requiresConfirmation?:boolean};
export type WorkspaceContract={version:"18.0.2";role:WorkspaceRole;deviceModes:WorkspaceDevice[];pageSizes:number[];filters:WorkspaceFilter[];actions:WorkspaceAction[];capabilities:{cardList:boolean;bottomSheetFilters:boolean;mobileToolbar:boolean;fullScreenModalOnPhone:boolean}};
export function workspaceContract(role:WorkspaceRole):WorkspaceContract{return{version:"18.0.2",role,deviceModes:["phone","tablet","desktop"],pageSizes:[10,20,50],filters:[{key:"q",label:"Search",type:"search"},{key:"status",label:"Status",type:"status"}],actions:[],capabilities:{cardList:true,bottomSheetFilters:true,mobileToolbar:true,fullScreenModalOnPhone:true}}}
export function pageMeta(page:number,pageSize:number,total:number):WorkspacePageMeta{return{page,pageSize,total,hasNext:page*pageSize<total}}


export type WorkspaceQuery={page:number;pageSize:number;q:string;status?:string;sort?:string;direction:"asc"|"desc"};
export function parseWorkspaceQuery(url:string):WorkspaceQuery{const p=new URL(url).searchParams;const page=Math.max(1,Number(p.get("page")||1)||1);const pageSize=Math.min(50,Math.max(1,Number(p.get("pageSize")||20)||20));const direction=p.get("direction")==="asc"?"asc":"desc";return{page,pageSize,q:(p.get("q")||"").trim().slice(0,120),status:p.get("status")||undefined,sort:p.get("sort")||undefined,direction}}
export type WorkspaceInteractionContract={version:"18.0.3";presentation:{phone:{records:"cards";filters:"bottom_sheet";actions:"sticky_toolbar";detail:"full_screen_sheet"};tablet:{records:"cards_or_table";filters:"popover_or_sheet";actions:"toolbar";detail:"centered_sheet"};desktop:{records:"table_or_cards";filters:"toolbar";actions:"toolbar";detail:"modal"}};query:{maxPageSize:50;maxSearchLength:120}};
export function workspaceInteractionContract():WorkspaceInteractionContract{return{version:"18.0.3",presentation:{phone:{records:"cards",filters:"bottom_sheet",actions:"sticky_toolbar",detail:"full_screen_sheet"},tablet:{records:"cards_or_table",filters:"popover_or_sheet",actions:"toolbar",detail:"centered_sheet"},desktop:{records:"table_or_cards",filters:"toolbar",actions:"toolbar",detail:"modal"}},query:{maxPageSize:50,maxSearchLength:120}}}


export type NativeWorkflowKind="customer_order"|"customer_payment"|"partner_settlement"|"partner_payment"|"admin_support"|"admin_customer_ops"|"admin_approval";
export function nativeWorkflowContract(kind:NativeWorkflowKind){return{version:"18.0.4",kind,presentation:{phone:{detail:"full_screen_sheet",summary:"transaction_card",actions:"sticky_workflow_toolbar",history:"timeline_cards"},tablet:{detail:"centered_sheet",summary:"expanded_card",actions:"toolbar",history:"timeline"},desktop:{detail:"modal_or_page",summary:"expanded_card",actions:"toolbar",history:"timeline"}},mutation:{idempotencyHeader:"Idempotency-Key",requireExplicitAction:true}}}


export type NativeUiState="loading"|"ready"|"empty"|"error";
export type NativeTimelineEvent={id:string;type:string;title:string;description?:string;occurredAt:string;actorId?:string;actorRole?:string;metadata?:Record<string,unknown>};
export function nativeCompletionContract(){return{version:"18.0.5",search:{maxLength:120,debounceMs:250},filters:{presentation:{phone:"bottom_sheet",tablet:"sheet_or_popover",desktop:"toolbar"},applyMode:"explicit"},drillDown:{phone:"full_screen",tablet:"centered_sheet",desktop:"modal_or_page"},timeline:{presentation:"event_cards",descending:true},confirmation:{financialActions:true,destructiveActions:true,defaultPresentation:"action_sheet"},states:["loading","ready","empty","error"] as NativeUiState[]}}
export function normalizeTimeline(events:NativeTimelineEvent[]){return[...events].sort((a,b)=>new Date(b.occurredAt).getTime()-new Date(a.occurredAt).getTime())}
