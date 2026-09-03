export type NotificationIdentity = { requestId?:string|null; stage?:string|null; id:string };
export class NotificationService { dedupe<T extends NotificationIdentity>(items:readonly T[]){const seen=new Set<string>();return items.filter((item)=>{const key=item.requestId&&item.stage?`${item.requestId}:${item.stage}`:item.id;if(seen.has(key))return false;seen.add(key);return true;});} }
export const notificationService=new NotificationService();
