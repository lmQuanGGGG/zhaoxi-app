import { completeExpiredOrders } from "@/lib/order-timers";
export class OrderService { async finalizeExpired(){await completeExpiredOrders();} }
export const orderService = new OrderService();
