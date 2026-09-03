export const PAYMENT_METHODS = ["cash_on_delivery","bank_transfer","wechat_pay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_STATUSES = ["pending","awaiting_payment","cash_due","paid","cash_collected","failed","cancelled","refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentRecord = { id:string; requestId:string; method:PaymentMethod; provider:string; status:PaymentStatus; amount:string|number; currency:string; providerReference?:string|null; checkoutPayload?:Record<string,unknown>; createdAt:string; updatedAt:string };
export type PaymentCapabilities = { cashOnDelivery:boolean; bankTransfer:boolean; wechatPay:boolean; wechatPayMode:string; wechatPayCurrency?:string };
export type WeChatNativeCheckout = { mode?:string; codeUrl?:string; qrDataUrl?:string; createdAt?:string; expiresAt?:string };
export const paymentMethodLabel = (method:string, locale:string) => {
  const labels:Record<string,Record<string,string>>={
    "vi-VN":{cash_on_delivery:"Thanh toán khi nhận hàng",bank_transfer:"Chuyển khoản ngân hàng",wechat_pay:"WeChat Pay"},
    "zh-CN":{cash_on_delivery:"货到付款",bank_transfer:"银行转账",wechat_pay:"微信支付"},
    "zh-TW":{cash_on_delivery:"貨到付款",bank_transfer:"銀行轉帳",wechat_pay:"微信支付"},
    "en-US":{cash_on_delivery:"Cash on delivery",bank_transfer:"Bank transfer",wechat_pay:"WeChat Pay"},
  }; return labels[locale]?.[method] || method;
};
export const paymentStatusLabel = (status:string, locale:string) => {
  const labels:Record<string,Record<string,string>>={
    "vi-VN":{pending:"Đang khởi tạo",awaiting_payment:"Chờ thanh toán",cash_due:"Thanh toán khi nhận",paid:"Đã thanh toán",cash_collected:"Đã thu tiền",failed:"Thanh toán thất bại",cancelled:"Đã hủy",refunded:"Đã hoàn tiền"},
    "zh-CN":{pending:"正在创建",awaiting_payment:"等待付款",cash_due:"货到付款",paid:"已付款",cash_collected:"已收款",failed:"付款失败",cancelled:"已取消",refunded:"已退款"},
    "zh-TW":{pending:"正在建立",awaiting_payment:"等待付款",cash_due:"貨到付款",paid:"已付款",cash_collected:"已收款",failed:"付款失敗",cancelled:"已取消",refunded:"已退款"},
    "en-US":{pending:"Initializing",awaiting_payment:"Awaiting payment",cash_due:"Pay on delivery",paid:"Paid",cash_collected:"Cash collected",failed:"Payment failed",cancelled:"Cancelled",refunded:"Refunded"},
  }; return labels[locale]?.[status] || status;
};
