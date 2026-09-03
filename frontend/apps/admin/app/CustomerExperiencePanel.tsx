"use client";
import {useEffect,useState} from "react";
import {useZhaoXiLocale,type ZhaoXiLocale} from "@zhaoxi/i18n";

type BannerRow={title:string;subtitle:string;cityLabel:string};
type Config={bannerEffect:number;bannerAutoCycle:boolean;bannerCycleSeconds:number;recommendationCycleSeconds:number;bannerContent:Record<ZhaoXiLocale,BannerRow>};
const locales:ZhaoXiLocale[]=["zh-CN","zh-TW","vi-VN","en-US"];
const copy={
"zh-CN":{title:"客户体验",hint:"管理客户首页欢迎横幅、视觉效果与推荐轮播。",save:"保存设置",saved:"已保存",effect:"横幅效果",auto:"自动轮换效果",bannerSeconds:"横幅轮换秒数",recommendSeconds:"推荐轮播秒数",content:"横幅内容",preview:"预览"},
"zh-TW":{title:"客戶體驗",hint:"管理客戶首頁歡迎橫幅、視覺效果與推薦輪播。",save:"儲存設定",saved:"已儲存",effect:"橫幅效果",auto:"自動輪換效果",bannerSeconds:"橫幅輪換秒數",recommendSeconds:"推薦輪播秒數",content:"橫幅內容",preview:"預覽"},
"vi-VN":{title:"Trải nghiệm Customer",hint:"Quản lý banner chào mừng, hiệu ứng và carousel gợi ý của Customer.",save:"Lưu cài đặt",saved:"Đã lưu",effect:"Hiệu ứng banner",auto:"Tự luân phiên hiệu ứng",bannerSeconds:"Chu kỳ banner (giây)",recommendSeconds:"Chu kỳ gợi ý (giây)",content:"Nội dung banner",preview:"Xem trước"},
"en-US":{title:"Customer experience",hint:"Manage the Customer welcome banner, visual effect, and recommendation carousel.",save:"Save settings",saved:"Saved",effect:"Banner effect",auto:"Auto-cycle effects",bannerSeconds:"Banner cycle seconds",recommendSeconds:"Recommendation cycle seconds",content:"Banner content",preview:"Preview"}} as const;
const names={"zh-CN":"简体中文","zh-TW":"繁體中文","vi-VN":"Tiếng Việt","en-US":"English"} as const;
const empty:Config={bannerEffect:0,bannerAutoCycle:false,bannerCycleSeconds:20,recommendationCycleSeconds:60,bannerContent:{
"zh-CN":{title:"欢迎来到岘港",subtitle:"赵喜陪伴您的每一天",cityLabel:"岘港"},
"zh-TW":{title:"歡迎來到峴港",subtitle:"趙喜陪伴您的每一天",cityLabel:"峴港"},
"vi-VN":{title:"Chào mừng đến Đà Nẵng",subtitle:"ZhaoXi đồng hành cùng bạn mỗi ngày",cityLabel:"Đà Nẵng"},
"en-US":{title:"Welcome to Da Nang",subtitle:"ZhaoXi is with you every day",cityLabel:"Da Nang"}}};

export default function CustomerExperiencePanel(){
 const{locale}=useZhaoXiLocale();const t=copy[locale];const[cfg,setCfg]=useState<Config>(empty);const[editLocale,setEditLocale]=useState<ZhaoXiLocale>(locale);const[msg,setMsg]=useState("");
 useEffect(()=>{fetch("/api/customer-ui-config",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j?.ok)setCfg({...empty,...j.data,bannerContent:{...empty.bannerContent,...j.data.bannerContent}})}).catch(()=>{})},[]);
 async function save(){setMsg("");const r=await fetch("/api/customer-ui-config",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(cfg)});const j=await r.json();if(r.ok&&j?.ok){setCfg({...cfg,...j.data});setMsg(t.saved)}else setMsg(j?.error?.code||"ERROR")}
 const row=cfg.bannerContent[editLocale];
 function updateRow(patch:Partial<BannerRow>){setCfg(v=>({...v,bannerContent:{...v.bannerContent,[editLocale]:{...v.bannerContent[editLocale],...patch}}}))}
 return <section style={{display:"grid",gap:14}}>
  <header><h1 style={{margin:"0 0 6px"}}>{t.title}</h1><p style={{margin:0,color:"#64748b"}}>{t.hint}</p></header>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
   <label>{t.effect}<select value={cfg.bannerEffect} onChange={e=>setCfg(v=>({...v,bannerEffect:Number(e.target.value)}))} style={input}>{[0,1,2,3].map(x=><option key={x} value={x}>Effect {x+1}</option>)}</select></label>
   <label>{t.recommendSeconds}<input type="number" min={30} max={300} value={cfg.recommendationCycleSeconds} onChange={e=>setCfg(v=>({...v,recommendationCycleSeconds:Number(e.target.value)}))} style={input}/></label>
   <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={cfg.bannerAutoCycle} onChange={e=>setCfg(v=>({...v,bannerAutoCycle:e.target.checked}))}/>{t.auto}</label>
   <label>{t.bannerSeconds}<input type="number" min={8} max={120} value={cfg.bannerCycleSeconds} onChange={e=>setCfg(v=>({...v,bannerCycleSeconds:Number(e.target.value)}))} style={input}/></label>
  </div>
  <section style={{padding:14,border:"1px solid #dfe7e3",borderRadius:18,background:"#fff"}}>
   <h2 style={{fontSize:17,margin:"0 0 10px"}}>{t.content}</h2>
   <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12}}>{locales.map(x=><button key={x} onClick={()=>setEditLocale(x)} style={{...chip,background:editLocale===x?"#07c160":"#f3f6f4",color:editLocale===x?"#fff":"#334155"}}>{names[x]}</button>)}</div>
   <div style={{display:"grid",gap:9}}><input value={row.title} onChange={e=>updateRow({title:e.target.value})} style={input}/><input value={row.subtitle} onChange={e=>updateRow({subtitle:e.target.value})} style={input}/><input value={row.cityLabel} onChange={e=>updateRow({cityLabel:e.target.value})} style={input}/></div>
  </section>
  <section style={{padding:18,borderRadius:20,color:"#fff",background:["linear-gradient(135deg,#087bde,#17b8dd,#59d0d9)","linear-gradient(130deg,#7654ff,#21b8db,#52d8be)","linear-gradient(135deg,#0aa56a,#08b99c,#3acbd0)","linear-gradient(135deg,#ff8359,#ff5d7c,#8f6cff)"][cfg.bannerEffect]}}>
   <small>{t.preview}</small><h2 style={{margin:"9px 0 5px"}}>{row.title}</h2><p style={{margin:0}}>{row.subtitle}</p>
  </section>
  <button onClick={save} style={{border:0,borderRadius:14,padding:"12px 16px",background:"#07c160",color:"#fff",fontWeight:850}}>{t.save}</button>
  {msg&&<b style={{color:"#078343"}}>{msg}</b>}
 </section>
}
const input={width:"100%",boxSizing:"border-box" as const,padding:"11px 12px",borderRadius:12,border:"1px solid #dbe4df",marginTop:5,background:"#fff"};
const chip={border:0,borderRadius:999,padding:"8px 10px",fontWeight:800,whiteSpace:"nowrap" as const};
