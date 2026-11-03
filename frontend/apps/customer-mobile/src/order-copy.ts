import type { ZhaoXiLocale } from "@zhaoxi/i18n";

type Step = { title: string; detail: string };
// Same wording as the PWA order page (order/[id]/page.tsx fulfillmentTimeline).
export const fulfillmentCopy: Record<ZhaoXiLocale, Record<string, Step>> = {
  "vi-VN": {
    PARTNER_ACCEPTED_FOOD_ORDER: { title: "Nhà hàng đã nhận đơn", detail: "Nhà hàng bắt đầu chuẩn bị món" },
    FOOD_PREPARING: { title: "Đang chuẩn bị món", detail: "Nhà hàng đang làm món cho đơn của bạn" },
    FOOD_READY_FOR_PICKUP: { title: "Món đã sẵn sàng", detail: "Chờ tài xế đến lấy món" },
    AUTO_READY_FOR_EXTERNAL_PICKUP: { title: "Món đã sẵn sàng", detail: "Chờ tài xế đến lấy món" },
    EXTERNAL_COURIER_BOOKED: { title: "Đã bố trí giao hàng", detail: "Tài xế sẽ đến nhà hàng lấy món" },
    FOOD_HANDED_TO_COURIER: { title: "Đã bàn giao món cho tài xế", detail: "Tài xế đang giao món đến địa chỉ của bạn" },
    EXTERNAL_DELIVERY_DELIVERED: { title: "Tài xế đã đến nơi", detail: "Hãy xuống lấy hàng" },
    FOOD_ORDER_CANCELLED: { title: "Đơn đã hủy", detail: "Đơn này sẽ không được tiếp tục xử lý" },
  },
  "en-US": {
    PARTNER_ACCEPTED_FOOD_ORDER: { title: "Restaurant accepted the order", detail: "The restaurant has started preparing your food" },
    FOOD_PREPARING: { title: "Preparing your food", detail: "The restaurant is making your order" },
    FOOD_READY_FOR_PICKUP: { title: "Food is ready", detail: "Waiting for the driver to pick it up" },
    AUTO_READY_FOR_EXTERNAL_PICKUP: { title: "Food is ready", detail: "Waiting for the driver to pick it up" },
    EXTERNAL_COURIER_BOOKED: { title: "Courier arranged", detail: "The driver will collect the food from the restaurant" },
    FOOD_HANDED_TO_COURIER: { title: "Food handed to driver", detail: "The driver is delivering to your address" },
    EXTERNAL_DELIVERY_DELIVERED: { title: "Driver has arrived", detail: "Please come down to collect your order" },
    FOOD_ORDER_CANCELLED: { title: "Order cancelled", detail: "This order will not be processed further" },
  },
  "zh-CN": {
    PARTNER_ACCEPTED_FOOD_ORDER: { title: "餐厅已接单", detail: "餐厅正在开始准备餐品" },
    FOOD_PREPARING: { title: "餐品正在准备", detail: "餐厅正在制作您的订单" },
    FOOD_READY_FOR_PICKUP: { title: "餐品已备好", detail: "等待配送员到店取餐" },
    AUTO_READY_FOR_EXTERNAL_PICKUP: { title: "餐品已备好", detail: "等待配送员到店取餐" },
    EXTERNAL_COURIER_BOOKED: { title: "已安排配送", detail: "配送员将前往餐厅取餐" },
    FOOD_HANDED_TO_COURIER: { title: "已交给配送员", detail: "配送员正把餐品送往您的地址" },
    EXTERNAL_DELIVERY_DELIVERED: { title: "配送员已到达", detail: "请下楼取餐" },
    FOOD_ORDER_CANCELLED: { title: "订单已取消", detail: "该订单不会继续处理" },
  },
  "zh-TW": {
    PARTNER_ACCEPTED_FOOD_ORDER: { title: "餐廳已接單", detail: "餐廳正在開始準備餐點" },
    FOOD_PREPARING: { title: "餐點正在準備", detail: "餐廳正在製作您的訂單" },
    FOOD_READY_FOR_PICKUP: { title: "餐點已備好", detail: "等待外送員到店取餐" },
    AUTO_READY_FOR_EXTERNAL_PICKUP: { title: "餐點已備好", detail: "等待外送員到店取餐" },
    EXTERNAL_COURIER_BOOKED: { title: "已安排配送", detail: "外送員將前往餐廳取餐" },
    FOOD_HANDED_TO_COURIER: { title: "已交給外送員", detail: "外送員正把餐點送往您的地址" },
    EXTERNAL_DELIVERY_DELIVERED: { title: "外送員已到達", detail: "請下樓取餐" },
    FOOD_ORDER_CANCELLED: { title: "訂單已取消", detail: "此訂單不會繼續處理" },
  },
};

/** Ordered milestones for the food progress bar. */
export const foodMilestones = ["placed", "preparing", "ready_for_pickup", "courier_booked", "handed_off", "delivered"] as const;
export type FoodMilestone = (typeof foodMilestones)[number];

export const milestoneLabels: Record<ZhaoXiLocale, Record<FoodMilestone, string>> = {
  "vi-VN": { placed: "Đã đặt", preparing: "Đang làm", ready_for_pickup: "Sẵn sàng", courier_booked: "Có tài xế", handed_off: "Đang giao", delivered: "Đã đến" },
  "en-US": { placed: "Placed", preparing: "Preparing", ready_for_pickup: "Ready", courier_booked: "Courier", handed_off: "On the way", delivered: "Arrived" },
  "zh-CN": { placed: "已下单", preparing: "制作中", ready_for_pickup: "已备好", courier_booked: "已派单", handed_off: "配送中", delivered: "已送达" },
  "zh-TW": { placed: "已下單", preparing: "製作中", ready_for_pickup: "已備好", courier_booked: "已派單", handed_off: "配送中", delivered: "已送達" },
};

export const paymentMethodLabels: Record<ZhaoXiLocale, Record<string, string>> = {
  "vi-VN": { cash_on_delivery: "Thanh toán khi nhận hàng", bank_transfer: "Chuyển khoản", wechat_pay: "WeChat Pay" },
  "en-US": { cash_on_delivery: "Cash on delivery", bank_transfer: "Bank transfer", wechat_pay: "WeChat Pay" },
  "zh-CN": { cash_on_delivery: "货到付款", bank_transfer: "银行转账", wechat_pay: "微信支付" },
  "zh-TW": { cash_on_delivery: "貨到付款", bank_transfer: "銀行轉帳", wechat_pay: "微信支付" },
};

export const paymentStatusLabels: Record<ZhaoXiLocale, Record<string, string>> = {
  "vi-VN": { pending: "Chờ thanh toán", awaiting_payment: "Chờ xác nhận chuyển khoản", cash_due: "Trả khi nhận hàng", cash_collected: "Đã thu tiền mặt", paid: "Đã thanh toán", failed: "Thất bại", refunded: "Đã hoàn tiền", cancelled: "Đã hủy" },
  "en-US": { pending: "Pending", awaiting_payment: "Awaiting confirmation", cash_due: "Pay on delivery", cash_collected: "Cash collected", paid: "Paid", failed: "Failed", refunded: "Refunded", cancelled: "Cancelled" },
  "zh-CN": { pending: "待支付", awaiting_payment: "等待确认转账", cash_due: "货到付款", cash_collected: "已收现金", paid: "已支付", failed: "支付失败", refunded: "已退款", cancelled: "已取消" },
  "zh-TW": { pending: "待付款", awaiting_payment: "等待確認轉帳", cash_due: "貨到付款", cash_collected: "已收現金", paid: "已付款", failed: "付款失敗", refunded: "已退款", cancelled: "已取消" },
};
