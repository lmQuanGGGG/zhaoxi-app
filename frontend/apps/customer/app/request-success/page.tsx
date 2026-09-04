"use client";
import {Suspense,useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {localizeOrganizationName,statusLabels,useZhaoXiLocale} from "@zhaoxi/i18n";
import {paymentMethodLabel,paymentStatusLabel,type PaymentRecord,type WeChatNativeCheckout} from "@zhaoxi/payment";
import MiniTabBar from "../_components/MiniTabBar";
import styles from "../request.module.css";

const copy={
"zh-CN":{title:"订单已提交",success:"订单已发送给商家",code:"订单编号",orders:"查看订单",home:"返回首页",payTitle:"微信支付",scan:"请使用微信扫描二维码完成支付",paid:"支付成功",preparing:"正在生成支付二维码…",payError:"暂时无法生成微信支付二维码",expires:"二维码有效期约15分钟"},
"zh-TW":{title:"訂單已提交",success:"訂單已送交商家",code:"訂單編號",orders:"查看訂單",home:"返回首頁",payTitle:"微信支付",scan:"請使用微信掃描 QR Code 完成付款",paid:"付款成功",preparing:"正在產生付款 QR Code…",payError:"暫時無法產生微信支付 QR Code",expires:"QR Code 約15分鐘有效"},
"vi-VN":{title:"Đã gửi đơn",success:"Đơn đã được chuyển đến đối tác",code:"Mã đơn",orders:"Xem đơn hàng",home:"Về trang chủ",payTitle:"WeChat Pay",scan:"Quét mã bằng WeChat để hoàn tất thanh toán",paid:"Thanh toán thành công",preparing:"Đang tạo mã thanh toán…",payError:"Chưa thể tạo mã WeChat Pay",expires:"Mã thanh toán có hiệu lực khoảng 15 phút"},
"en-US":{title:"Order submitted",success:"Your order was sent to the partner",code:"Order code",orders:"View orders",home:"Back home",payTitle:"WeChat Pay",scan:"Scan with WeChat to complete payment",paid:"Payment successful",preparing:"Preparing payment QR…",payError:"Unable to create WeChat Pay QR",expires:"The payment QR is valid for about 15 minutes"}} as const;

function Content(){
 const params=useSearchParams();const{locale}=useZhaoXiLocale();const[status,setStatus]=useState("assigned");const[payment,setPayment]=useState<PaymentRecord|null>(null);const[payError,setPayError]=useState("");const[creating,setCreating]=useState(false);
 const code=params.get("code")||"ZX";const id=params.get("id")||"";const partnerCode=params.get("partnerCode");const partnerFallback=params.get("partner");
 const load=useCallback(async()=>{if(!id)return;try{const[orderResponse,paymentResponse]=await Promise.all([fetch(`/api/platform-requests/${encodeURIComponent(id)}?locale=${locale}`,{cache:"no-store"}),fetch(`/api/platform-payments?requestId=${encodeURIComponent(id)}`,{cache:"no-store"})]);const order=await orderResponse.json().catch(()=>null);const payments=await paymentResponse.json().catch(()=>null);if(order?.data?.status)setStatus(order.data.status);const row=Array.isArray(payments?.data)?payments.data[0]:null;if(row)setPayment(row)}catch{}},[id,locale]);
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(timer)},[load]);
 useEffect(()=>{const checkout=(payment?.checkoutPayload||{}) as WeChatNativeCheckout;if(!payment||payment.method!=="wechat_pay"||payment.status==="paid"||checkout.qrDataUrl||creating)return;setCreating(true);setPayError("");fetch(`/api/platform-payments/${encodeURIComponent(payment.id)}/wechat/native`,{method:"POST"}).then(async r=>{const d=await r.json().catch(()=>null);if(!r.ok||!d?.data)throw new Error(d?.error?.message||"WECHAT_PAY_FAILED");setPayment(d.data)}).catch(e=>setPayError(e instanceof Error?e.message:"WECHAT_PAY_FAILED")).finally(()=>setCreating(false))},[payment?.id,payment?.status,payment?.checkoutPayload,creating]);
 const t=copy[locale];const partner=localizeOrganizationName(locale,partnerCode,partnerFallback);const checkout=(payment?.checkoutPayload||{}) as WeChatNativeCheckout;
 return <main className={styles.shell}><section className={styles.success}><div className={styles.successIcon}>✓</div><small>ZHAOXI</small><h1>{t.title}</h1><p>{t.success}{partner?` — ${partner}`:""}</p><label>{t.code}</label><strong>{code}</strong><span>{statusLabels[locale][status]||status}</span>
 {payment&&<div className={styles.paymentPanel}><b>💳 {paymentMethodLabel(payment.method,locale)}</b><p style={{margin:"6px 0",color:payment.status==="paid"?"#07a856":"#64748b"}}>{paymentStatusLabel(payment.status,locale)}</p>{payment.method==="wechat_pay"&&payment.status!=="paid"&&<>{checkout.qrDataUrl?<><img src={checkout.qrDataUrl} alt={t.payTitle} className={styles.paymentQr}/><p style={{margin:"8px 0 2px"}}>{t.scan}</p><small>{t.expires}</small></>:creating?<p>{t.preparing}</p>:payError?<p style={{color:"#b42318"}}>{t.payError}</p>:null}</>}{payment.status==="paid"&&<strong style={{display:"block",color:"#07a856",marginTop:8}}>✓ {t.paid}</strong>}</div>}
 <Link className={styles.primary} href="/orders">{t.orders}</Link><Link className={styles.secondary} href="/">{t.home}</Link></section><MiniTabBar/></main>
}
function Loading(){return <main className={styles.shell}><section className={styles.success}><p>…</p></section></main>}
export default function Page(){return <Suspense fallback={<Loading/>}><Content/></Suspense>}
