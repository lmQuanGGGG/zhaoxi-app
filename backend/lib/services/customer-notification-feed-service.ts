import {and,desc,eq,inArray} from "drizzle-orm";
import {getDb} from "@/db";
import {
  customerNotificationStates,moduleTranslations,modules,organizations,paymentTransactions,
  serviceRequests,serviceRequestStatusHistory,services,serviceTranslations,supportConversations,supportMessages
} from "@/db/schema";

type Kind="order"|"payment"|"assistant";
type Event={
 eventKey:string;kind:Kind;requestId?:string|null;requestCode?:string|null;status?:string|null;
 title:string;body:string;deepLink:string;createdAt:Date;read:boolean;deleted:boolean;
};

const statusBody:Record<string,Record<string,string>>={
 "zh-CN":{new:"订单已创建",reviewing:"订单正在审核",assigned:"已分配合作伙伴",accepted:"合作伙伴已接单",in_progress:"服务进行中",waiting_customer:"等待您的确认",completed:"订单已完成",cancelled:"订单已取消",rejected:"订单未被接受"},
 "zh-TW":{new:"訂單已建立",reviewing:"訂單正在審核",assigned:"已分配合作夥伴",accepted:"合作夥伴已接單",in_progress:"服務進行中",waiting_customer:"等待您的確認",completed:"訂單已完成",cancelled:"訂單已取消",rejected:"訂單未被接受"},
 "vi-VN":{new:"Đơn đã được tạo",reviewing:"Đơn đang được xem xét",assigned:"Đã phân công đối tác",accepted:"Đối tác đã nhận đơn",in_progress:"Dịch vụ đang được thực hiện",waiting_customer:"Đang chờ bạn xác nhận",completed:"Đơn đã hoàn thành",cancelled:"Đơn đã hủy",rejected:"Đơn chưa được tiếp nhận"},
 "en-US":{new:"Order created",reviewing:"Order is being reviewed",assigned:"Partner assigned",accepted:"Partner accepted the order",in_progress:"Service in progress",waiting_customer:"Waiting for your confirmation",completed:"Order completed",cancelled:"Order cancelled",rejected:"Order was not accepted"},
};
const paymentBody:Record<string,Record<string,string>>={
 "zh-CN":{pending:"等待付款",paid:"付款成功",failed:"付款失败",expired:"付款二维码已过期",refunded:"已退款"},
 "zh-TW":{pending:"等待付款",paid:"付款成功",failed:"付款失敗",expired:"付款 QR Code 已過期",refunded:"已退款"},
 "vi-VN":{pending:"Đang chờ thanh toán",paid:"Thanh toán thành công",failed:"Thanh toán thất bại",expired:"Mã thanh toán đã hết hạn",refunded:"Đã hoàn tiền"},
 "en-US":{pending:"Payment pending",paid:"Payment successful",failed:"Payment failed",expired:"Payment QR expired",refunded:"Refunded"},
};

const deliveryBody:Record<string,Record<string,string>>={
 "zh-CN":{DRIVER_ASSIGNED:"骑手已接单",DELIVERY_PICKED_UP:"骑手已取货",DELIVERY_DELIVERING:"订单配送中",DELIVERY_DELIVERED:"订单已送达",DELIVERY_CANCELLED:"配送已取消"},
 "zh-TW":{DRIVER_ASSIGNED:"騎手已接單",DELIVERY_PICKED_UP:"騎手已取貨",DELIVERY_DELIVERING:"訂單配送中",DELIVERY_DELIVERED:"訂單已送達",DELIVERY_CANCELLED:"配送已取消"},
 "vi-VN":{DRIVER_ASSIGNED:"Tài xế đã nhận chuyến",DELIVERY_PICKED_UP:"Tài xế đã lấy hàng",DELIVERY_DELIVERING:"Đơn đang được giao",DELIVERY_DELIVERED:"Đơn đã giao thành công",DELIVERY_CANCELLED:"Chuyến giao đã hủy"},
 "en-US":{DRIVER_ASSIGNED:"Driver accepted the delivery",DELIVERY_PICKED_UP:"Driver picked up the order",DELIVERY_DELIVERING:"Order is on the way",DELIVERY_DELIVERED:"Order delivered",DELIVERY_CANCELLED:"Delivery cancelled"},
};

const externalDeliveryBody:Record<string,Record<string,string>>={
 "zh-CN":{PARTNER_ACCEPTED_FOOD_ORDER:"餐厅已接单并开始准备",FOOD_PREPARING:"餐品正在准备",FOOD_READY_FOR_PICKUP:"餐品已备好，等待取餐",EXTERNAL_COURIER_BOOKED:"已安排外部配送",FOOD_HANDED_TO_COURIER:"餐品已交给配送员",EXTERNAL_DELIVERY_DELIVERED:"订单已送达",FOOD_ORDER_CANCELLED:"订单已取消",AUTO_READY_FOR_EXTERNAL_PICKUP:"餐品已备好，等待取餐"},
 "zh-TW":{PARTNER_ACCEPTED_FOOD_ORDER:"餐廳已接單並開始準備",FOOD_PREPARING:"餐點正在準備",FOOD_READY_FOR_PICKUP:"餐點已備好，等待取餐",EXTERNAL_COURIER_BOOKED:"已安排外部配送",FOOD_HANDED_TO_COURIER:"餐點已交給配送員",EXTERNAL_DELIVERY_DELIVERED:"訂單已送達",FOOD_ORDER_CANCELLED:"訂單已取消",AUTO_READY_FOR_EXTERNAL_PICKUP:"餐點已備好，等待取餐"},
 "vi-VN":{PARTNER_ACCEPTED_FOOD_ORDER:"Nhà hàng đã nhận và bắt đầu chuẩn bị món",FOOD_PREPARING:"Món đang được chuẩn bị",FOOD_READY_FOR_PICKUP:"Món đã sẵn sàng, chờ lấy món",EXTERNAL_COURIER_BOOKED:"Đã bố trí đơn vị giao hàng",FOOD_HANDED_TO_COURIER:"Món đã được bàn giao cho người giao",EXTERNAL_DELIVERY_DELIVERED:"Đơn đã giao đến khách",FOOD_ORDER_CANCELLED:"Đơn đã hủy",AUTO_READY_FOR_EXTERNAL_PICKUP:"Món đã sẵn sàng, chờ lấy món"},
 "en-US":{PARTNER_ACCEPTED_FOOD_ORDER:"Restaurant accepted the order and started preparation",FOOD_PREPARING:"Food is being prepared",FOOD_READY_FOR_PICKUP:"Food is ready for pickup",EXTERNAL_COURIER_BOOKED:"External courier arranged",FOOD_HANDED_TO_COURIER:"Food handed to courier",EXTERNAL_DELIVERY_DELIVERED:"Order delivered",FOOD_ORDER_CANCELLED:"Order cancelled",AUTO_READY_FOR_EXTERNAL_PICKUP:"Food is ready for pickup"},
};
externalDeliveryBody["zh-CN"].EXTERNAL_DELIVERY_DELIVERED="骑手已到，请下楼取餐。";
externalDeliveryBody["zh-TW"].EXTERNAL_DELIVERY_DELIVERED="外送員已到，請下樓取餐。";
externalDeliveryBody["vi-VN"].EXTERNAL_DELIVERY_DELIVERED="Tài xế đã đến, hãy xuống lấy hàng.";
externalDeliveryBody["en-US"].EXTERNAL_DELIVERY_DELIVERED="Your driver has arrived. Please come down to collect your order.";
const assistantTitle={"zh-CN":"赵喜助手","zh-TW":"趙喜助手","vi-VN":"Trợ lý ZhaoXi","en-US":"ZhaoXi Assistant"} as Record<string,string>;
const orderTitle={"zh-CN":"订单更新","zh-TW":"訂單更新","vi-VN":"Cập nhật đơn hàng","en-US":"Order update"} as Record<string,string>;
const paymentTitle={"zh-CN":"付款更新","zh-TW":"付款更新","vi-VN":"Cập nhật thanh toán","en-US":"Payment update"} as Record<string,string>;

export class CustomerNotificationFeedService{
 async list(userId:string,locale:string){
  const db=getDb();
  const orders=await db.select({
   requestId:serviceRequests.id,requestCode:serviceRequests.requestCode,
   serviceName:serviceTranslations.name,moduleName:moduleTranslations.name,organizationName:organizations.name,
  }).from(serviceRequests)
   .innerJoin(modules,eq(serviceRequests.moduleId,modules.id))
   .leftJoin(services,eq(serviceRequests.serviceId,services.id))
   .leftJoin(serviceTranslations,and(eq(serviceTranslations.serviceId,services.id),eq(serviceTranslations.locale,locale)))
   .leftJoin(moduleTranslations,and(eq(moduleTranslations.moduleId,modules.id),eq(moduleTranslations.locale,locale)))
   .leftJoin(organizations,eq(serviceRequests.assignedOrganizationId,organizations.id))
   .where(eq(serviceRequests.customerId,userId)).limit(100);
  const requestIds=orders.map(x=>x.requestId);
  if(!requestIds.length)return{items:[],unreadCount:0};
  const orderMap=new Map(orders.map(x=>[x.requestId,x]));

  const [history,payments,conversations,states]=await Promise.all([
   db.select().from(serviceRequestStatusHistory).where(inArray(serviceRequestStatusHistory.requestId,requestIds)).orderBy(desc(serviceRequestStatusHistory.createdAt)).limit(120),
   db.select().from(paymentTransactions).where(inArray(paymentTransactions.requestId,requestIds)).orderBy(desc(paymentTransactions.updatedAt)).limit(80),
   db.select().from(supportConversations).where(and(eq(supportConversations.userId,userId),eq(supportConversations.role,"customer"))).orderBy(desc(supportConversations.lastMessageAt)).limit(30),
   db.select().from(customerNotificationStates).where(eq(customerNotificationStates.userId,userId)),
  ]);
  const stateMap=new Map(states.map(x=>[x.eventKey,x]));
  const events:Event[]=[];

  for(const row of history){
   const order=orderMap.get(row.requestId);if(!order)continue;
   const eventKey=`order:${row.id}`;const st=stateMap.get(eventKey);
   const label=order.serviceName||order.moduleName||order.requestCode;
   const deliveryNote=row.note&&(externalDeliveryBody[locale]?.[row.note]||deliveryBody[locale]?.[row.note]);
   events.push({eventKey,kind:"order",requestId:row.requestId,requestCode:order.requestCode,status:row.toStatus,
    title:`${orderTitle[locale]||orderTitle["zh-CN"]} · ${label}`,
    body:deliveryNote||row.note||statusBody[locale]?.[row.toStatus]||row.toStatus,
    deepLink:`/order/${row.requestId}`,createdAt:row.createdAt,read:Boolean(st?.readAt),deleted:Boolean(st?.deletedAt)});
  }

  for(const row of payments){
   const order=orderMap.get(row.requestId);if(!order)continue;
   const eventKey=`payment:${row.id}:${row.status}`;const st=stateMap.get(eventKey);
   events.push({eventKey,kind:"payment",requestId:row.requestId,requestCode:order.requestCode,status:row.status,
    title:`${paymentTitle[locale]||paymentTitle["zh-CN"]} · ${order.requestCode}`,
    body:paymentBody[locale]?.[row.status]||row.status,deepLink:`/order/${row.requestId}`,
    createdAt:row.updatedAt,read:Boolean(st?.readAt),deleted:Boolean(st?.deletedAt)});
  }

  const conversationIds=conversations.map(x=>x.id);
  if(conversationIds.length){
   const messages=await db.select({
    id:supportMessages.id,conversationId:supportMessages.conversationId,senderRole:supportMessages.senderRole,
    body:supportMessages.body,createdAt:supportMessages.createdAt
   }).from(supportMessages).where(inArray(supportMessages.conversationId,conversationIds))
    .orderBy(desc(supportMessages.createdAt)).limit(80);
   const convMap=new Map(conversations.map(x=>[x.id,x]));
   for(const row of messages){
    if(!["assistant","admin","support"].includes(row.senderRole))continue;
    const conv=convMap.get(row.conversationId);if(!conv)continue;
    const eventKey=`assistant:${row.id}`;const st=stateMap.get(eventKey);
    events.push({eventKey,kind:"assistant",title:assistantTitle[locale]||assistantTitle["zh-CN"],body:row.body,
      deepLink:`/support?conversation=${row.conversationId}`,createdAt:row.createdAt,read:Boolean(st?.readAt),deleted:Boolean(st?.deletedAt)});
   }
  }

  const visible=events.filter(x=>!x.deleted).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime()).slice(0,100);
  return{items:visible,unreadCount:visible.filter(x=>!x.read).length};
 }

 async mark(userId:string,eventKeys:string[],read=true){
  const db=getDb(),now=new Date();
  for(const eventKey of eventKeys.slice(0,100)){
   await db.insert(customerNotificationStates).values({userId,eventKey,readAt:read?now:null,updatedAt:now})
    .onConflictDoUpdate({target:[customerNotificationStates.userId,customerNotificationStates.eventKey],set:{readAt:read?now:null,updatedAt:now}});
  }
  return{updated:eventKeys.length};
 }
 async remove(userId:string,eventKeys:string[]){
  const db=getDb(),now=new Date();
  for(const eventKey of eventKeys.slice(0,100)){
   await db.insert(customerNotificationStates).values({userId,eventKey,deletedAt:now,updatedAt:now})
    .onConflictDoUpdate({target:[customerNotificationStates.userId,customerNotificationStates.eventKey],set:{deletedAt:now,updatedAt:now}});
  }
  return{deleted:eventKeys.length};
 }
}
export const customerNotificationFeedService=new CustomerNotificationFeedService();
