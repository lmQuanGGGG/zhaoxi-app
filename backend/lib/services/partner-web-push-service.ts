import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { partnerPushSubscriptions } from "@/db/schema";

const publicKey=process.env.ZHAOXI_WEB_PUSH_PUBLIC_KEY;
const privateKey=process.env.ZHAOXI_WEB_PUSH_PRIVATE_KEY;
const enabled=Boolean(publicKey&&privateKey);
if(enabled)webpush.setVapidDetails("mailto:admin@zhaoxi.vn",publicKey!,privateKey!);
export const partnerWebPushService={
  publicKey:()=>publicKey||null,
  async sendNewOrder(organizationId:string,order:{id:string;requestCode:string;customerName:string}){
    if(!enabled)return {sent:0,enabled:false};
    const subscriptions=await getDb().select().from(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.organizationId,organizationId));
    let sent=0;
    await Promise.all(subscriptions.map(async subscription=>{try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:"🔔 Có đơn hàng mới",body:`${order.requestCode} · ${order.customerName}`,url:"/orders",tag:`zhaoxi-order-${order.id}`}));sent++;}catch(error){const code=Number((error as {statusCode?:number})?.statusCode||0);if(code===404||code===410)await getDb().delete(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.id,subscription.id));}}));
    return {sent,enabled:true};
  },
};
