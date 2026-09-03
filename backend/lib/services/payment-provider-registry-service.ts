export type ProviderCapability={qr:boolean;redirect:boolean;query:boolean;close:boolean;refund:boolean;webhook:boolean;reconciliation:boolean};
export type ProviderRegistryEntry={id:string;name:string;category:"generic"|"wallet"|"bank"|"card";enabled:boolean;beta:boolean;capabilities:ProviderCapability;requires:{merchantId:boolean;checkoutUrl:boolean;qrPayload:boolean;credentialRef:boolean;webhookSecretRef:boolean};notes:string[]};
const entries:ProviderRegistryEntry[]=[
{id:"partner_checkout_link",name:"Partner Checkout Link",category:"generic",enabled:true,beta:false,capabilities:{qr:false,redirect:true,query:false,close:false,refund:false,webhook:true,reconciliation:true},requires:{merchantId:true,checkoutUrl:true,qrPayload:false,credentialRef:false,webhookSecretRef:true},notes:["Partner owns checkout URL","Customer funds go directly to Partner"]},
{id:"partner_qr",name:"Partner QR",category:"generic",enabled:true,beta:false,capabilities:{qr:true,redirect:false,query:false,close:false,refund:false,webhook:true,reconciliation:true},requires:{merchantId:true,checkoutUrl:false,qrPayload:true,credentialRef:false,webhookSecretRef:true},notes:["Partner owns QR payload/template","Customer funds go directly to Partner"]},
{id:"custom_api",name:"Custom Partner API",category:"generic",enabled:true,beta:true,capabilities:{qr:true,redirect:true,query:true,close:true,refund:true,webhook:true,reconciliation:true},requires:{merchantId:true,checkoutUrl:false,qrPayload:false,credentialRef:true,webhookSecretRef:true},notes:["Provider-specific adapter required before production use","Raw credentials are never stored in database"]}
];
export class PaymentProviderRegistryService{
 list(){return entries.map(x=>({...x,capabilityCount:Object.values(x.capabilities).filter(Boolean).length}))}
 get(id:string){const x=entries.find(v=>v.id===id);if(!x)throw new Error("PAYMENT_PROVIDER_NOT_REGISTERED");return x}
 onboarding(providerId:string,config:Record<string,unknown>){const p=this.get(providerId),steps=[
 {key:"provider_enabled",ok:p.enabled,required:true},
 {key:"merchant_id",ok:!p.requires.merchantId||Boolean(String(config.merchantId||"").trim()),required:p.requires.merchantId},
 {key:"checkout_url",ok:!p.requires.checkoutUrl||String(config.checkoutUrl||"").startsWith("https://"),required:p.requires.checkoutUrl},
 {key:"qr_payload",ok:!p.requires.qrPayload||Boolean(String(config.qrPayload||"").trim()),required:p.requires.qrPayload},
 {key:"credential_ref",ok:!p.requires.credentialRef||String(config.credentialRef||"").startsWith("ZX_PARTNER_GATEWAY_"),required:p.requires.credentialRef},
 {key:"webhook_secret_ref",ok:!p.requires.webhookSecretRef||String(config.webhookSecretRef||"").startsWith("ZX_PARTNER_GATEWAY_"),required:p.requires.webhookSecretRef},
 {key:"direct_to_partner",ok:true,required:true},
 {key:"platform_holds_funds_false",ok:true,required:true}
 ];return{provider:p,steps,ready:steps.filter(x=>x.required).every(x=>x.ok),capabilities:p.capabilities,directToPartner:true,platformHoldsFunds:false}}
 health(){return entries.map(x=>({providerId:x.id,name:x.name,enabled:x.enabled,beta:x.beta,status:x.enabled?"available":"disabled",capabilities:x.capabilities}))}
}
export const paymentProviderRegistryService=new PaymentProviderRegistryService();
