export const ORDER_STATUSES = ["new","reviewing","assigned","accepted","in_progress","waiting_customer","completed","cancelled","rejected"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type DeliveryStage = "preparing"|"finding_courier"|"delivering"|"delivered";
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
 new:["reviewing","assigned","cancelled"], reviewing:["assigned","cancelled"], assigned:["accepted","rejected","cancelled"], accepted:["in_progress","completed","cancelled"], in_progress:["waiting_customer","completed","cancelled"], waiting_customer:["in_progress","completed","cancelled"], completed:[], cancelled:[], rejected:[]
};
export function canTransitionOrder(from:OrderStatus,to:OrderStatus){return ORDER_TRANSITIONS[from].includes(to);}
export function estimatedCompletionAt(minutes:number, acceptedAt=new Date()){return new Date(acceptedAt.getTime()+minutes*60_000).toISOString();}
export function remainingSeconds(end?:string|null, now=Date.now()){if(!end)return 0;const value=new Date(end).getTime();return Number.isFinite(value)?Math.max(0,Math.ceil((value-now)/1000)):0;}
export type CartLine = { serviceId:string; organizationId:string; name:string; unitPrice:number; quantity:number; imageUrl?:string };
export function cartSubtotal(lines:readonly CartLine[]){return lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);}
export function groupCartByOrganization(lines:readonly CartLine[]){return lines.reduce<Record<string,CartLine[]>>((groups,line)=>{(groups[line.organizationId]??=[]).push(line);return groups;},{});}
