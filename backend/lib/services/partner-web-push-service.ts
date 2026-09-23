import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { partnerMobilePushDevices, partnerPushSubscriptions } from "@/db/schema";

const publicKey=process.env.ZHAOXI_WEB_PUSH_PUBLIC_KEY;
const privateKey=process.env.ZHAOXI_WEB_PUSH_PRIVATE_KEY;
const enabled=Boolean(publicKey&&privateKey);
if(enabled)webpush.setVapidDetails("mailto:admin@zhaoxi.vn",publicKey!,privateKey!);
async function sendMobilePush(organizationId:string,message:{title:string;body:string;orderId:string;kind:"new_order"|"payment_reported"}){
  const devices=await getDb().select().from(partnerMobilePushDevices).where(eq(partnerMobilePushDevices.organizationId,organizationId));
  const active=devices.filter(device=>device.enabled);
  if(!active.length)return {sent:0,enabled:true};
  const response=await fetch("https://exp.host/--/api/v2/push/send",{
    method:"POST",
    headers:{"content-type":"application/json","accept":"application/json","accept-encoding":"gzip, deflate"},
    body:JSON.stringify(active.map(device=>({
      to:device.expoPushToken,title:message.title,body:message.body,
      sound:"order_alert.wav",priority:"high",channelId:"new-orders",
      data:{orderId:message.orderId,kind:message.kind,screen:"orders"},
      categoryId:"ORDER_ACTIONS",mutableContent:true,
    }))),
  });
  if(!response.ok)return {sent:0,enabled:false};
  const payload=await response.json().catch(()=>null) as {data?:Array<{status?:string;details?:{error?:string}}> }|null;
  const receipts=Array.isArray(payload?.data)?payload.data:[];
  await Promise.all(receipts.map(async(receipt,index)=>{
    if(receipt?.details?.error==="DeviceNotRegistered"&&active[index]){
      await getDb().update(partnerMobilePushDevices).set({enabled:false,updatedAt:new Date()}).where(eq(partnerMobilePushDevices.id,active[index].id));
    }
  }));
  return {sent:receipts.filter(x=>x.status==="ok").length,enabled:true};
}
export const partnerWebPushService={
  publicKey:()=>publicKey||null,
  async sendNewOrder(organizationId:string,order:{id:string;requestCode:string;customerName:string}){
    const mobile=sendMobilePush(organizationId,{title:"🔔 Có đơn hàng mới",body:`${order.requestCode} · ${order.customerName}`,orderId:order.id,kind:"new_order"});
    if(!enabled)return mobile;
    const subscriptions=await getDb().select().from(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.organizationId,organizationId));
    let sent=0;
    await Promise.all(subscriptions.map(async subscription=>{try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:"🔔 Có đơn hàng mới",body:`${order.requestCode} · ${order.customerName}`,url:"/orders",tag:`zhaoxi-order-${order.id}`}));sent++;}catch(error){const code=Number((error as {statusCode?:number})?.statusCode||0);if(code===404||code===410)await getDb().delete(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.id,subscription.id));}}));
    const native=await mobile;return {sent:sent+native.sent,enabled:true};
  },
  async sendPaymentReported(organizationId:string,order:{id:string;requestCode:string;customerName:string;amount:string;currency:string}){
    const mobile=sendMobilePush(organizationId,{title:"💳 Khách đã báo chuyển khoản",body:`${order.customerName} · ${Number(order.amount).toLocaleString("vi-VN")} ${order.currency} · ${order.requestCode}`,orderId:order.id,kind:"payment_reported"});
    if(!enabled)return mobile;
    const subscriptions=await getDb().select().from(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.organizationId,organizationId));
    let sent=0;
    await Promise.all(subscriptions.map(async subscription=>{try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:"💳 Khách đã báo chuyển khoản",body:`${order.customerName} · ${Number(order.amount).toLocaleString("vi-VN")} ${order.currency} · ${order.requestCode}. Kiểm tra tiền vào rồi nhận đơn.`,url:"/orders",tag:`zhaoxi-payment-${order.id}`,requireInteraction:true,renotify:true}));sent++;}catch(error){const code=Number((error as {statusCode?:number})?.statusCode||0);if(code===404||code===410)await getDb().delete(partnerPushSubscriptions).where(eq(partnerPushSubscriptions.id,subscription.id));}}));
    const native=await mobile;return {sent:sent+native.sent,enabled:true};
  },
};
