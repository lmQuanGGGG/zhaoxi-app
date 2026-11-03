"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useZhaoXiLocale} from "@zhaoxi/i18n";
import {getCached,setCached} from "./_lib/client-cache";

type Locale="vi-VN"|"en-US"|"zh-CN"|"zh-TW";
type Platform="ios"|"android";
type Audience=""|"members"|"partner"|"internal";
type ReleaseStatus="draft"|"published"|"rolled_back";
type Release={
 id:string;miniappId:string;platform:Platform;version:string;runtime:number;manifest:Record<string,unknown>;sha256:string;sizeBytes:number;keyId:string;bundleFile:string;
 status:ReleaseStatus;rolloutPercent:number;notes:string|null;createdAt:string;publishedAt:string|null;rolledBackAt:string|null;rollbackReason:string|null;duplicate?:boolean;
};
type Live={stable:string|null;rollout:{version:string;percent:number}|null};
type MiniApp={
 id:string;title:Partial<Record<Locale,string>>;subtitle:Partial<Record<Locale,string>>;icon:string;tint:string;chrome:"light"|"dark";audience:Exclude<Audience,"">|null;
 enabled:boolean;sortOrder:number;live:Record<Platform,Live>;releases:Release[];
};
type UploadResult={miniappId:string;version:string;createdApp:boolean;releases:Release[]};
type Draft={title:Record<Locale,string>;subtitle:Record<Locale,string>;icon:string;tint:string;chrome:"light"|"dark";audience:Audience;sortOrder:string;enabled:boolean};

const LOCALES:Locale[]=["vi-VN","en-US","zh-CN","zh-TW"];
const PLATFORMS:Platform[]=["ios","android"];
// One request through the Vercel function: keep it under the platform body limit (4.5 MB).
const MAX_UPLOAD_BYTES=4*1024*1024;

const copy={
 "vi-VN":{title:"Mini app",subtitle:"Kho lưu và phát hành mini app cho app ZhaoXi: upload bản build đã ký, phát hành theo % người dùng, rollback.",refresh:"Làm mới",upload:"Upload bản build",uploadHint:"Chọn thư mục dist/ (hoặc file .zip của nó) do zhaoxi-miniapp build tạo. Server kiểm lại hash và chữ ký Ed25519 trước khi lưu; bản mới ở trạng thái nháp.",pickFolder:"Chọn thư mục dist",pickZip:"Chọn file .zip",notes:"Ghi chú phát hành (tuỳ chọn)",send:"Kiểm tra & lưu",uploading:"Đang kiểm tra…",selected:"Đã chọn",files:"file",tooBig:"Gói quá 4 MB, không upload qua web được.",uploaded:"Đã lưu",duplicate:"đã có, bỏ qua",newApp:"Mini app mới đã được tạo, hãy chỉnh tên, icon, nhóm người dùng.",apps:"Mini app",empty:"Chưa có mini app nào. Upload bản build đầu tiên ở trên.",open:"Quản lý",enabled:"Đang bật",disabled:"Đã tắt",everyone:"Mọi người",members:"Đã đăng nhập",partner:"Đối tác",internal:"Nội bộ (admin)",stable:"Ổn định",rollout:"Đang rollout",none:"Chưa phát hành",info:"Thông tin hiển thị",name:"Tên",desc:"Mô tả",icon:"Icon (Ionicons)",tint:"Màu",chrome:"Nút kính",chromeLight:"Sáng (đầu trang tối)",chromeDark:"Tối (đầu trang sáng)",audience:"Ai thấy",sort:"Thứ tự",save:"Lưu thông tin",saved:"Đã lưu",kill:"Tắt mini app (kill switch)",revive:"Bật lại mini app",confirmKill:"Tắt mini app này? Nó biến mất khỏi app ZhaoXi và mọi bản đã phát hành ngừng tải được.",releases:"Phiên bản",draft:"Nháp",published:"Đã phát hành",rolled_back:"Đã rollback",publish:"Phát hành",percent:"% người dùng",setRollout:"Đặt %",rollback:"Rollback",confirmRollback:"Rollback bản này? Người dùng quay về bản phát hành trước đó.",reason:"Lý do rollback (ghi vào audit log)",manifest:"Xem manifest",hide:"Ẩn manifest",size:"Dung lượng",key:"Khoá ký",created:"Tạo lúc",publishedAt:"Phát hành lúc",noReleases:"Chưa có bản build cho nền tảng này.",close:"Đóng",live:"Người dùng đang nhận"},
 "en-US":{title:"Mini apps",subtitle:"Storage and release of mini apps for the ZhaoXi app: upload signed builds, release to a % of users, roll back.",refresh:"Refresh",upload:"Upload a build",uploadHint:"Pick the dist/ folder (or a .zip of it) made by zhaoxi-miniapp build. The server re-checks hash and Ed25519 signature before storing; new builds start as drafts.",pickFolder:"Pick dist folder",pickZip:"Pick .zip file",notes:"Release note (optional)",send:"Verify & store",uploading:"Verifying…",selected:"Selected",files:"files",tooBig:"Package is over 4 MB and cannot go through the web upload.",uploaded:"Stored",duplicate:"already stored, skipped",newApp:"A new mini app was created; set its name, icon and audience.",apps:"Mini apps",empty:"No mini apps yet. Upload the first build above.",open:"Manage",enabled:"Enabled",disabled:"Disabled",everyone:"Everyone",members:"Signed-in users",partner:"Partners",internal:"Internal (admins)",stable:"Stable",rollout:"Rolling out",none:"Not released",info:"Display",name:"Name",desc:"Description",icon:"Icon (Ionicons)",tint:"Colour",chrome:"Glass button",chromeLight:"Light (dark header)",chromeDark:"Dark (light header)",audience:"Audience",sort:"Order",save:"Save",saved:"Saved",kill:"Disable mini app (kill switch)",revive:"Enable mini app",confirmKill:"Disable this mini app? It disappears from the ZhaoXi app and no release can be downloaded.",releases:"Versions",draft:"Draft",published:"Published",rolled_back:"Rolled back",publish:"Publish",percent:"% of users",setRollout:"Set %",rollback:"Roll back",confirmRollback:"Roll back this release? Users return to the previous release.",reason:"Rollback reason (goes to the audit log)",manifest:"View manifest",hide:"Hide manifest",size:"Size",key:"Signing key",created:"Created",publishedAt:"Published",noReleases:"No builds for this platform yet.",close:"Close",live:"Users get"},
 "zh-CN":{title:"小程序",subtitle:"赵喜 App 的小程序存储与发布：上传已签名的构建，按用户比例发布，回滚。",refresh:"刷新",upload:"上传构建",uploadHint:"选择 zhaoxi-miniapp build 生成的 dist/ 文件夹（或其 .zip）。服务器保存前会重新校验哈希和 Ed25519 签名；新版本为草稿。",pickFolder:"选择 dist 文件夹",pickZip:"选择 .zip 文件",notes:"发布说明（可选）",send:"校验并保存",uploading:"校验中…",selected:"已选择",files:"个文件",tooBig:"包超过 4 MB，无法通过网页上传。",uploaded:"已保存",duplicate:"已存在，跳过",newApp:"已创建新小程序，请设置名称、图标和可见用户。",apps:"小程序",empty:"还没有小程序。请先上传第一个构建。",open:"管理",enabled:"已启用",disabled:"已停用",everyone:"所有人",members:"已登录用户",partner:"商家",internal:"内部（管理员）",stable:"稳定版",rollout:"灰度中",none:"未发布",info:"展示信息",name:"名称",desc:"描述",icon:"图标 (Ionicons)",tint:"颜色",chrome:"玻璃按钮",chromeLight:"浅色（深色顶部）",chromeDark:"深色（浅色顶部）",audience:"可见用户",sort:"排序",save:"保存",saved:"已保存",kill:"停用小程序（紧急开关）",revive:"重新启用小程序",confirmKill:"停用该小程序？它将从赵喜 App 消失，所有已发布版本都无法下载。",releases:"版本",draft:"草稿",published:"已发布",rolled_back:"已回滚",publish:"发布",percent:"用户比例 %",setRollout:"设置 %",rollback:"回滚",confirmRollback:"回滚该版本？用户将回到上一个已发布版本。",reason:"回滚原因（写入审计日志）",manifest:"查看 manifest",hide:"收起 manifest",size:"大小",key:"签名密钥",created:"创建于",publishedAt:"发布于",noReleases:"该平台还没有构建。",close:"关闭",live:"用户获得"},
 "zh-TW":{title:"小程式",subtitle:"趙喜 App 的小程式儲存與發佈：上傳已簽名的建置，按使用者比例發佈，回滾。",refresh:"重新整理",upload:"上傳建置",uploadHint:"選擇 zhaoxi-miniapp build 產生的 dist/ 資料夾（或其 .zip）。伺服器儲存前會重新驗證雜湊與 Ed25519 簽名；新版本為草稿。",pickFolder:"選擇 dist 資料夾",pickZip:"選擇 .zip 檔",notes:"發佈說明（選填）",send:"驗證並儲存",uploading:"驗證中…",selected:"已選擇",files:"個檔案",tooBig:"套件超過 4 MB，無法透過網頁上傳。",uploaded:"已儲存",duplicate:"已存在，略過",newApp:"已建立新小程式，請設定名稱、圖示與可見使用者。",apps:"小程式",empty:"尚無小程式。請先上傳第一個建置。",open:"管理",enabled:"已啟用",disabled:"已停用",everyone:"所有人",members:"已登入使用者",partner:"商家",internal:"內部（管理員）",stable:"穩定版",rollout:"灰度中",none:"未發佈",info:"顯示資訊",name:"名稱",desc:"描述",icon:"圖示 (Ionicons)",tint:"顏色",chrome:"玻璃按鈕",chromeLight:"淺色（深色頂部）",chromeDark:"深色（淺色頂部）",audience:"可見使用者",sort:"排序",save:"儲存",saved:"已儲存",kill:"停用小程式（緊急開關）",revive:"重新啟用小程式",confirmKill:"停用此小程式？它將從趙喜 App 消失，所有已發佈版本都無法下載。",releases:"版本",draft:"草稿",published:"已發佈",rolled_back:"已回滾",publish:"發佈",percent:"使用者比例 %",setRollout:"設定 %",rollback:"回滾",confirmRollback:"回滾此版本？使用者將回到上一個已發佈版本。",reason:"回滾原因（寫入稽核紀錄）",manifest:"檢視 manifest",hide:"收起 manifest",size:"大小",key:"簽名金鑰",created:"建立於",publishedAt:"發佈於",noReleases:"此平台尚無建置。",close:"關閉",live:"使用者取得"},
} as const;
type Copy=(typeof copy)[Locale];

const kb=(n:number)=>`${(n/1024).toFixed(1)} KB`;
const when=(v:string|null)=>v?new Date(v).toLocaleString():"—";
const nameOf=(app:MiniApp,locale:Locale)=>app.title[locale]||app.title["vi-VN"]||app.title["en-US"]||app.id;
const audienceLabel=(t:Copy,a:MiniApp["audience"])=>a?t[a]:t.everyone;
function draftOf(app:MiniApp):Draft{
 const pick=(m:Partial<Record<Locale,string>>)=>Object.fromEntries(LOCALES.map(l=>[l,m[l]||""])) as Record<Locale,string>;
 return{title:pick(app.title),subtitle:pick(app.subtitle),icon:app.icon,tint:app.tint,chrome:app.chrome,audience:app.audience||"",sortOrder:String(app.sortOrder),enabled:app.enabled};
}
async function api<T>(url:string,init?:RequestInit):Promise<T>{
 const r=await fetch(url,{cache:"no-store",...init});const j=await r.json().catch(()=>null);
 if(!r.ok||!j?.ok)throw new Error(j?.error?.message?`${j.error.code||r.status}: ${j.error.message}`:(j?.error?.code||`HTTP ${r.status}`));
 return j.data as T;
}

export default function MiniAppRegistryPanel(){
 const{locale}=useZhaoXiLocale();const loc=(LOCALES.includes(locale as Locale)?locale:"en-US") as Locale;const t=copy[loc];
 const[apps,setApps]=useState<MiniApp[]|null>(()=>getCached<MiniApp[]>("admin_miniapps"));
 const[error,setError]=useState("");const[selected,setSelected]=useState("");
 const apply=(data:MiniApp[])=>{setApps(data);setCached("admin_miniapps",data);setError("")};
 const fail=(e:unknown)=>setError(e instanceof Error?e.message:"LOAD_FAILED");
 async function load(){try{apply(await api<MiniApp[]>("/api/admin-miniapps"))}catch(e){fail(e)}}
 useEffect(()=>{let live=true;api<MiniApp[]>("/api/admin-miniapps").then(d=>{if(live)apply(d)},e=>{if(live)fail(e)});return()=>{live=false}},[]);
 const app=apps?.find(x=>x.id===selected)||null;
 return <section style={{display:"grid",gap:14}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><h1 style={{margin:"0 0 5px"}}>{t.title}</h1><p style={{margin:0,color:"#64748b",fontSize:12}}>{t.subtitle}</p></div><button onClick={()=>void load()} style={pill(false)}>↻ {t.refresh}</button></header>
  <UploadCard t={t} onUploaded={async(result)=>{await load();if(result.createdApp)setSelected(result.miniappId)}}/>
  <section style={card}>
   <b style={{fontSize:11}}>{t.apps}</b>
   {error&&<p style={{color:"#b42318",fontSize:10}}>{error}</p>}
   <div style={{display:"grid",gap:8,marginTop:10}}>{apps&&!apps.length?<small style={{color:"#64748b"}}>{t.empty}</small>:(apps||[]).map(x=><article key={x.id} style={row}>
    <i style={{...appIcon,background:x.tint}}>{nameOf(x,loc).slice(0,1)}</i>
    <div style={{minWidth:0}}>
     <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><b style={{fontSize:11}}>{nameOf(x,loc)}</b><Badge text={x.enabled?t.enabled:t.disabled} tone={x.enabled?"good":"bad"}/><Badge text={audienceLabel(t,x.audience)} tone="info"/></div>
     <small style={{display:"block",color:"#64748b",marginTop:4,fontFamily:"ui-monospace,monospace"}}>{x.id}</small>
     <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:5}}>{PLATFORMS.map(p=><small key={p} style={{fontSize:9}}><b>{p==="ios"?"iOS":"Android"}</b> {x.live[p].stable?`${t.stable} ${x.live[p].stable}`:t.none}{x.live[p].rollout?` · ${t.rollout} ${x.live[p].rollout!.version} (${x.live[p].rollout!.percent}%)`:""}</small>)}</div>
    </div>
    <button onClick={()=>setSelected(x.id)} style={openBtn}>{t.open}</button>
   </article>)}</div>
  </section>
  {app&&<AppModal key={app.id} app={app} t={t} loc={loc} onClose={()=>setSelected("")} reload={load}/>}
 </section>
}

function UploadCard({t,onUploaded}:{t:Copy;onUploaded:(r:UploadResult)=>Promise<void>}){
 const folderRef=useRef<HTMLInputElement>(null);const zipRef=useRef<HTMLInputElement>(null);
 const[files,setFiles]=useState<File[]>([]);const[zip,setZip]=useState<File|null>(null);const[notes,setNotes]=useState("");
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
 // `webkitdirectory` is not in React's input typings; set it on the element.
 useEffect(()=>{folderRef.current?.setAttribute("webkitdirectory","");folderRef.current?.setAttribute("directory","")},[]);
 const total=zip?zip.size:files.reduce((s,f)=>s+f.size,0);
 function pickFolder(list:FileList|null){
  // Only what the server reads: <platform>/manifest.json and the .js bundles.
  const picked=Array.from(list||[]).filter(f=>/(^|\/)(ios|android)\/[^/]+\.(json|js)$/.test(f.webkitRelativePath||f.name));
  setFiles(picked);setZip(null);setMessage(null);
 }
 async function send(){
  if(total>MAX_UPLOAD_BYTES){setMessage({ok:false,text:t.tooBig});return}
  const form=new FormData();
  if(zip)form.append("archive",zip,zip.name);else for(const f of files)form.append("files",f,f.webkitRelativePath||f.name);
  if(notes.trim())form.append("notes",notes.trim());
  setBusy(true);setMessage(null);
  try{
   const result=await api<UploadResult>("/api/admin-miniapps",{method:"POST",body:form});
   const parts=result.releases.map(r=>`${r.platform} ${r.version}${r.duplicate?` (${t.duplicate})`:""}`).join(" · ");
   setMessage({ok:true,text:`${t.uploaded}: ${result.miniappId} · ${parts}${result.createdApp?` — ${t.newApp}`:""}`});
   setFiles([]);setZip(null);setNotes("");if(folderRef.current)folderRef.current.value="";if(zipRef.current)zipRef.current.value="";
   await onUploaded(result);
  }catch(e){setMessage({ok:false,text:e instanceof Error?e.message:"UPLOAD_FAILED"})}finally{setBusy(false)}
 }
 const ready=(zip||files.length)&&!busy;
 return <section style={card}>
  <b style={{fontSize:11}}>{t.upload}</b>
  <p style={{margin:"5px 0 10px",color:"#64748b",fontSize:9}}>{t.uploadHint}</p>
  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
   <button onClick={()=>folderRef.current?.click()} style={pill(files.length>0)}>📁 {t.pickFolder}</button>
   <button onClick={()=>zipRef.current?.click()} style={pill(Boolean(zip))}>🗜 {t.pickZip}</button>
   <input ref={folderRef} type="file" multiple hidden onChange={e=>pickFolder(e.target.files)}/>
   <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={e=>{setZip(e.target.files?.[0]||null);setFiles([]);setMessage(null)}}/>
  </div>
  {(zip||files.length>0)&&<small style={{display:"block",marginTop:8,fontSize:9,color:"#334155"}}>{t.selected}: {zip?zip.name:`${files.length} ${t.files} (${files.map(f=>(f.webkitRelativePath||f.name).split("/").slice(-2).join("/")).join(", ")})`} · {kb(total)}</small>}
  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginTop:9}}>
   <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t.notes} style={input}/>
   <button disabled={!ready} onClick={()=>void send()} style={{...good,opacity:ready?1:.5}}>{busy?t.uploading:t.send}</button>
  </div>
  {message&&<p style={{margin:"9px 0 0",fontSize:9,color:message.ok?"#067647":"#b42318",wordBreak:"break-word"}}>{message.text}</p>}
 </section>
}

function AppModal({app,t,loc,onClose,reload}:{app:MiniApp;t:Copy;loc:Locale;onClose:()=>void;reload:()=>Promise<void>}){
 const[draft,setDraft]=useState<Draft>(()=>draftOf(app));const[platform,setPlatform]=useState<Platform>("ios");
 const[busy,setBusy]=useState("");const[error,setError]=useState("");const[saved,setSaved]=useState(false);
 const releases=useMemo(()=>app.releases.filter(r=>r.platform===platform),[app.releases,platform]);
 async function run(key:string,fn:()=>Promise<unknown>){setBusy(key);setError("");setSaved(false);try{await fn();await reload();return true}catch(e){setError(e instanceof Error?e.message:"FAILED");return false}finally{setBusy("")}}
 const patchApp=(body:Record<string,unknown>)=>api(`/api/admin-miniapps/${encodeURIComponent(app.id)}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const releaseAction=(id:string,body:Record<string,unknown>)=>api(`/api/admin-miniapps/releases/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 async function save(){
  const ok=await run("save",()=>patchApp({title:draft.title,subtitle:draft.subtitle,icon:draft.icon,tint:draft.tint,chrome:draft.chrome,audience:draft.audience||null,sortOrder:Number(draft.sortOrder)||0}));
  if(ok)setSaved(true);
 }
 async function toggle(){if(app.enabled&&!window.confirm(t.confirmKill))return;await run("toggle",()=>patchApp({enabled:!app.enabled}))}
 const live=app.live[platform];
 return <div style={overlay} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section style={modal}>
  <header style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
   <div style={{display:"flex",gap:10,alignItems:"center",minWidth:0}}><i style={{...appIcon,background:draft.tint}}>{(draft.title[loc]||app.id).slice(0,1)}</i><div style={{minWidth:0}}><h2 style={{margin:"0 0 3px"}}>{nameOf(app,loc)}</h2><small style={{fontFamily:"ui-monospace,monospace",color:"#64748b"}}>{app.id}</small></div></div>
   <button onClick={onClose} style={close} aria-label={t.close}>×</button>
  </header>
  {error&&<p style={{margin:0,color:"#b42318",fontSize:10,wordBreak:"break-word"}}>{error}</p>}

  <section style={card}>
   <b style={{fontSize:11}}>{t.info}</b>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8,marginTop:9}}>
    {LOCALES.map(l=><label key={l} style={label}>{t.name} · {l}<input value={draft.title[l]} maxLength={120} onChange={e=>setDraft({...draft,title:{...draft.title,[l]:e.target.value}})} style={input}/></label>)}
    {LOCALES.map(l=><label key={`s-${l}`} style={label}>{t.desc} · {l}<input value={draft.subtitle[l]} maxLength={240} onChange={e=>setDraft({...draft,subtitle:{...draft.subtitle,[l]:e.target.value}})} style={input}/></label>)}
    <label style={label}>{t.icon}<input value={draft.icon} onChange={e=>setDraft({...draft,icon:e.target.value})} placeholder="storefront-outline" style={input}/></label>
    <label style={label}>{t.tint}<span style={{display:"grid",gridTemplateColumns:"38px 1fr",gap:6}}><input type="color" value={/^#[0-9a-f]{6}$/i.test(draft.tint)?draft.tint:"#0faf7a"} onChange={e=>setDraft({...draft,tint:e.target.value.toUpperCase()})} style={{...input,padding:2,height:36}}/><input value={draft.tint} onChange={e=>setDraft({...draft,tint:e.target.value})} style={input}/></span></label>
    <label style={label}>{t.chrome}<select value={draft.chrome} onChange={e=>setDraft({...draft,chrome:e.target.value as Draft["chrome"]})} style={input}><option value="light">{t.chromeLight}</option><option value="dark">{t.chromeDark}</option></select></label>
    <label style={label}>{t.audience}<select value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value as Audience})} style={input}><option value="">{t.everyone}</option><option value="members">{t.members}</option><option value="partner">{t.partner}</option><option value="internal">{t.internal}</option></select></label>
    <label style={label}>{t.sort}<input inputMode="numeric" value={draft.sortOrder} onChange={e=>setDraft({...draft,sortOrder:e.target.value.replace(/[^\d-]/g,"")})} style={input}/></label>
   </div>
   <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
    <button disabled={!!busy} onClick={()=>void save()} style={good}>{t.save}</button>
    <button disabled={!!busy} onClick={()=>void toggle()} style={app.enabled?danger:good}>{app.enabled?t.kill:t.revive}</button>
    {saved&&<small style={{color:"#067647",fontSize:9}}>✓ {t.saved}</small>}
   </div>
  </section>

  <section style={card}>
   <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <b style={{fontSize:11}}>{t.releases}</b>
    <div style={{display:"flex",gap:6}}>{PLATFORMS.map(p=><button key={p} onClick={()=>setPlatform(p)} style={pill(platform===p)}>{p==="ios"?"iOS":"Android"} · {app.releases.filter(r=>r.platform===p).length}</button>)}</div>
   </div>
   <small style={{display:"block",marginTop:7,fontSize:9,color:"#334155"}}>{t.live}: {live.stable?`${t.stable} ${live.stable}`:t.none}{live.rollout?` · ${t.rollout} ${live.rollout.version} → ${live.rollout.percent}%`:""}</small>
   <div style={{display:"grid",gap:8,marginTop:10}}>{!releases.length?<small style={{color:"#64748b"}}>{t.noReleases}</small>:releases.map(r=><ReleaseRow key={r.id} r={r} t={t} busy={busy} run={run} act={releaseAction}/>)}</div>
  </section>
 </section></div>
}

function ReleaseRow({r,t,busy,run,act}:{r:Release;t:Copy;busy:string;run:(key:string,fn:()=>Promise<unknown>)=>Promise<boolean>;act:(id:string,body:Record<string,unknown>)=>Promise<unknown>}){
 const[percent,setPercent]=useState(String(r.rolloutPercent));const[showManifest,setShowManifest]=useState(false);
 const value=Math.max(0,Math.min(100,Number(percent)||0));
 async function rollback(){if(!window.confirm(t.confirmRollback))return;const reason=window.prompt(t.reason)||"";await run(`rb-${r.id}`,()=>act(r.id,{action:"rollback",reason}))}
 const tone=r.status==="published"?"good":r.status==="rolled_back"?"bad":"info";
 return <article style={{...row,gridTemplateColumns:"1fr",gap:8}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",alignItems:"center"}}>
   <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><b style={{fontSize:12}}>v{r.version}</b><Badge text={t[r.status]} tone={tone}/>{r.status==="published"&&<Badge text={`${r.rolloutPercent}%`} tone="info"/>}</div>
   <small style={{fontSize:8,color:"#64748b"}}>{t.size} {kb(r.sizeBytes)} · {t.key} <code>{r.keyId}</code> · runtime {r.runtime}</small>
  </div>
  <small style={{fontSize:8,color:"#64748b"}}>{t.created} {when(r.createdAt)}{r.publishedAt?` · ${t.publishedAt} ${when(r.publishedAt)}`:""}{r.rollbackReason?` · ${r.rollbackReason}`:""}{r.notes?` · ${r.notes}`:""}</small>
  <small style={{fontSize:8,color:"#94a3b8",fontFamily:"ui-monospace,monospace",wordBreak:"break-all"}}>sha256 {r.sha256}</small>
  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
   <label style={{...label,gridTemplateColumns:"auto 64px",alignItems:"center",gap:6}}>{t.percent}<input inputMode="numeric" value={percent} onChange={e=>setPercent(e.target.value.replace(/\D/g,"").slice(0,3))} style={{...input,padding:"6px 8px"}}/></label>
   {r.status==="published"
    ?<><button disabled={!!busy||value===r.rolloutPercent} onClick={()=>void run(`ro-${r.id}`,()=>act(r.id,{action:"rollout",rolloutPercent:value}))} style={soft}>{t.setRollout}</button><button disabled={!!busy} onClick={()=>void rollback()} style={danger}>{t.rollback}</button></>
    :<button disabled={!!busy} onClick={()=>void run(`pub-${r.id}`,()=>act(r.id,{action:"publish",rolloutPercent:value}))} style={good}>{t.publish} · {value}%</button>}
   <button onClick={()=>setShowManifest(!showManifest)} style={soft}>{showManifest?t.hide:t.manifest}</button>
  </div>
  {showManifest&&<pre style={{margin:0,fontSize:9,whiteSpace:"pre-wrap",wordBreak:"break-all",background:"#f8fafc",padding:10,borderRadius:10,maxHeight:260,overflow:"auto"}}>{JSON.stringify(r.manifest,null,2)}</pre>}
 </article>
}

function Badge({text,tone}:{text:string;tone:"good"|"bad"|"info"}){const c=tone==="good"?["#ecfdf5","#067647"]:tone==="bad"?["#fff1f2","#b42318"]:["#eff6ff","#1d4ed8"];return <span style={{padding:"3px 6px",borderRadius:999,background:c[0],color:c[1],fontSize:7,fontWeight:900}}>{text}</span>}
const pill=(active:boolean)=>({border:"1px solid #dbe4df",borderRadius:999,padding:"7px 10px",background:active?"#07c160":"#fff",color:active?"#fff":"#111827",fontSize:8,fontWeight:850,cursor:"pointer"});
const card={padding:12,borderRadius:16,background:"#fff",boxShadow:"0 12px 34px rgba(15,23,42,.07)"} as const;
const row={padding:11,borderRadius:14,background:"#fff",boxShadow:"0 8px 24px rgba(15,23,42,.06)",display:"grid",gridTemplateColumns:"38px 1fr auto",gap:10,alignItems:"center"} as const;
const appIcon={width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",color:"#fff",fontStyle:"normal",fontWeight:900,fontSize:15,flex:"0 0 auto"} as const;
const label={display:"grid",gap:5,fontSize:9,color:"#64748b"} as const;
const input={width:"100%",boxSizing:"border-box",border:"1px solid #dbe5df",borderRadius:10,padding:"9px 10px",background:"#fff",font:"inherit"} as const;
const overlay={position:"fixed",inset:0,zIndex:100,background:"rgba(15,23,42,.48)",display:"grid",placeItems:"center",padding:12} as const;
const modal={width:"min(100%,820px)",maxHeight:"92vh",overflowY:"auto",background:"#f8faf9",borderRadius:20,padding:14,display:"grid",gap:10} as const;
const close={border:0,borderRadius:999,width:32,height:32,background:"#eef2f0",fontSize:18,cursor:"pointer"} as const;
const openBtn={border:0,borderRadius:10,padding:"8px 10px",background:"#ecfdf5",color:"#067647",fontWeight:850,cursor:"pointer"} as const;
const good={border:0,borderRadius:11,padding:"9px 12px",background:"#07c160",color:"#fff",fontWeight:850,cursor:"pointer"} as const;
const soft={border:0,borderRadius:11,padding:"9px 12px",background:"#eef2f0",color:"#111827",fontWeight:800,cursor:"pointer"} as const;
const danger={border:0,borderRadius:11,padding:"9px 12px",background:"#fff1f2",color:"#b42318",fontWeight:850,cursor:"pointer"} as const;
