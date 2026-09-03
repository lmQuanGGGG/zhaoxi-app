export type NotificationAudience = "customer"|"partner"|"admin";
export type NotificationStage = "created"|"accepted"|"in_progress"|"completed"|"finding_courier"|"delivering"|"delivered"|"system";
export type ZhaoXiNotification = { id:string; audience:NotificationAudience; stage:NotificationStage; title:string; message:string; requestId?:string; createdAt:string; read?:boolean };
export function notificationDedupeKey(item:Pick<ZhaoXiNotification,"requestId"|"stage"|"id">){return item.requestId?`${item.requestId}:${item.stage}`:item.id;}
export function dedupeNotifications<T extends Pick<ZhaoXiNotification,"requestId"|"stage"|"id">>(items:readonly T[]){const seen=new Set<string>();return items.filter((item)=>{const key=notificationDedupeKey(item);if(seen.has(key))return false;seen.add(key);return true;});}
export function markAllRead<T extends ZhaoXiNotification>(items:readonly T[]){return items.map((item)=>({...item,read:true}));}
