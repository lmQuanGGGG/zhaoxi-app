export type ProviderPaymentStatus="pending"|"paid"|"failed"|"cancelled"|"closed"|"refunded";
export type ProviderPayment={intentId:string;amount:number;currency:string;providerReference?:string|null;status:ProviderPaymentStatus;checkoutUrl?:string|null;qrPayload?:string|null};
export type VerifyWebhookResult={ok:boolean;status:ProviderPaymentStatus;intentId:string;providerReference?:string|null;rawStatus:string};
export interface PaymentProviderAdapter{
 createPayment(input:{intentId:string;amount:number;currency:string;checkoutUrl?:string|null;qrPayload?:string|null}):Promise<ProviderPayment>;
 queryPayment(input:{intentId:string;storedStatus:ProviderPaymentStatus;providerReference?:string|null}):Promise<ProviderPayment>;
 closePayment(input:{intentId:string;storedStatus:ProviderPaymentStatus}):Promise<ProviderPayment>;
 refundPayment(input:{intentId:string;storedStatus:ProviderPaymentStatus;amount:number}):Promise<ProviderPayment>;
 verifyWebhook(input:{intentId:string;status:string;providerReference?:string|null}):Promise<VerifyWebhookResult>;
 reconcileTransaction(input:{intentId:string;zhaoxiStatus:ProviderPaymentStatus;providerStatus:ProviderPaymentStatus}):Promise<{matched:boolean;recommendedStatus:ProviderPaymentStatus}>;
}
class PassivePartnerAdapter implements PaymentProviderAdapter{
 async createPayment(i:{intentId:string;amount:number;currency:string;checkoutUrl?:string|null;qrPayload?:string|null}):Promise<ProviderPayment>{return{intentId:i.intentId,amount:i.amount,currency:i.currency,status:"pending",checkoutUrl:i.checkoutUrl||null,qrPayload:i.qrPayload||null}}
 async queryPayment(i:{intentId:string;storedStatus:ProviderPaymentStatus;providerReference?:string|null}):Promise<ProviderPayment>{return{intentId:i.intentId,amount:0,currency:"VND",status:i.storedStatus,providerReference:i.providerReference||null}}
 async closePayment(i:{intentId:string;storedStatus:ProviderPaymentStatus}):Promise<ProviderPayment>{if(i.storedStatus==="paid"||i.storedStatus==="refunded")throw new Error("PAYMENT_CANNOT_CLOSE");return{intentId:i.intentId,amount:0,currency:"VND",status:"closed"}}
 async refundPayment(i:{intentId:string;storedStatus:ProviderPaymentStatus;amount:number}):Promise<ProviderPayment>{if(i.storedStatus!=="paid")throw new Error("PAYMENT_NOT_REFUNDABLE");return{intentId:i.intentId,amount:i.amount,currency:"VND",status:"refunded"}}
 async verifyWebhook(i:{intentId:string;status:string;providerReference?:string|null}):Promise<VerifyWebhookResult>{const raw=String(i.status||"").toLowerCase(),status=(["pending","paid","failed","cancelled","closed","refunded"].includes(raw)?raw:"failed") as ProviderPaymentStatus;return{ok:true,status,intentId:i.intentId,providerReference:i.providerReference||null,rawStatus:raw}}
 async reconcileTransaction(i:{intentId:string;zhaoxiStatus:ProviderPaymentStatus;providerStatus:ProviderPaymentStatus}):Promise<{matched:boolean;recommendedStatus:ProviderPaymentStatus}>{return{matched:i.zhaoxiStatus===i.providerStatus,recommendedStatus:i.providerStatus}}
}
export class PaymentProviderAdapterService{
 adapter(provider:string):PaymentProviderAdapter{if(["partner_checkout_link","partner_qr","custom_api"].includes(provider))return new PassivePartnerAdapter();throw new Error("PAYMENT_PROVIDER_UNSUPPORTED")}
}
export const paymentProviderAdapterService=new PaymentProviderAdapterService();
