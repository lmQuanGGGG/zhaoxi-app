"use client";
import{useEffect,useState}from"react";import AdminSupportDesk from"./AdminSupportDesk";import{useZhaoXiLocale}from"@zhaoxi/i18n";
type Config={basicAssistantEnabled:boolean;paidHumanEnabled:boolean;paidHumanFee:number;paidHumanCurrency:string;emergencyPriority:boolean};
const fallback:Config={basicAssistantEnabled:true,paidHumanEnabled:true,paidHumanFee:50000,paidHumanCurrency:"VND",emergencyPriority:true};
const copy={
"zh-CN":{title:"客户支持",hint:"配置赵喜助手与人工 1对1 支持。",basic:"启用基础助手",human:"启用人工 1对1",fee:"人工服务费用",priority:"紧急求助优先",save:"保存",saved:"已保存"},
"zh-TW":{title:"客戶支援",hint:"設定趙喜助手與人工 1對1 支援。",basic:"啟用基礎助手",human:"啟用人工 1對1",fee:"人工服務費用",priority:"緊急求助優先",save:"儲存",saved:"已儲存"},
"vi-VN":{title:"Hỗ trợ Customer",hint:"Cấu hình Trợ lý ZhaoXi và hỗ trợ nhân viên 1-1.",basic:"Bật trợ lý cơ bản",human:"Bật nhân viên 1-1",fee:"Phí hỗ trợ 1-1",priority:"Ưu tiên hỗ trợ khẩn cấp",save:"Lưu",saved:"Đã lưu"},
"en-US":{title:"Customer support",hint:"Configure ZhaoXi Assistant and paid 1-to-1 staff support.",basic:"Enable basic assistant",human:"Enable 1-to-1 staff",fee:"1-to-1 support fee",priority:"Prioritize emergency support",save:"Save",saved:"Saved"}} as const;
export default function CustomerSupportPanel(){const{locale}=useZhaoXiLocale();const t=copy[locale];const[cfg,setCfg]=useState<Config>(fallback);const[msg,setMsg]=useState("");
useEffect(()=>{fetch("/api/customer-support-config",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.ok)setCfg({...fallback,...j.data})}).catch(()=>{})},[]);
async function save(){setMsg("");const r=await fetch("/api/customer-support-config",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(cfg)});const j=await r.json();if(r.ok&&j?.ok){setCfg({...cfg,...j.data});setMsg(t.saved)}else setMsg(j?.error?.code||"ERROR")}
return <section style={{display:"grid",gap:14}}><AdminSupportDesk/><header><h1 style={{margin:"0 0 6px"}}>{t.title}</h1><p style={{margin:0,color:"#64748b"}}>{t.hint}</p></header>
<section style={{display:"grid",gap:10,padding:14,border:"1px solid #dfe7e3",borderRadius:18,background:"#fff"}}>
<label style={check}><input type="checkbox" checked={cfg.basicAssistantEnabled} onChange={e=>setCfg(v=>({...v,basicAssistantEnabled:e.target.checked}))}/>{t.basic}</label>
<label style={check}><input type="checkbox" checked={cfg.paidHumanEnabled} onChange={e=>setCfg(v=>({...v,paidHumanEnabled:e.target.checked}))}/>{t.human}</label>
<label>{t.fee}<div style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8,marginTop:5}}><input type="number" min={0} value={cfg.paidHumanFee} onChange={e=>setCfg(v=>({...v,paidHumanFee:Number(e.target.value)}))} style={input}/><input value={cfg.paidHumanCurrency} maxLength={8} onChange={e=>setCfg(v=>({...v,paidHumanCurrency:e.target.value.toUpperCase()}))} style={input}/></div></label>
<label style={check}><input type="checkbox" checked={cfg.emergencyPriority} onChange={e=>setCfg(v=>({...v,emergencyPriority:e.target.checked}))}/>{t.priority}</label>
</section>
<button onClick={save} style={{border:0,borderRadius:14,padding:"12px 16px",background:"#07c160",color:"#fff",fontWeight:850}}>{t.save}</button>{msg&&<b style={{color:"#078343"}}>{msg}</b>}</section>}
const input={width:"100%",boxSizing:"border-box" as const,padding:"11px 12px",borderRadius:12,border:"1px solid #dbe4df",background:"#fff"};const check={display:"flex",alignItems:"center",gap:9,padding:"8px 0",fontWeight:750};
