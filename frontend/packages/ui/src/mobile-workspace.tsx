"use client";
import type{CSSProperties,ReactNode}from"react";
import{useEffect,useState}from"react";

export type ZhaoXiDevice="phone"|"tablet"|"desktop";
export function useZhaoXiDevice():ZhaoXiDevice{
 const[d,setD]=useState<ZhaoXiDevice>("phone");
 useEffect(()=>{const f=()=>setD(innerWidth<768?"phone":innerWidth<1200?"tablet":"desktop");f();addEventListener("resize",f);return()=>removeEventListener("resize",f)},[]);
 return d;
}
export function MobileWorkspace({title,description,actions,children}:{title?:ReactNode;description?:ReactNode;actions?:ReactNode;children:ReactNode}){
 return <section className="zx-native-workspace"><header className="zx-workspace-head">{title&&<div><h1>{title}</h1>{description&&<p>{description}</p>}</div>}{actions&&<div className="zx-workspace-actions">{actions}</div>}</header><div className="zx-workspace-body">{children}</div></section>
}
export function MobileCard({children,className=""}:{children:ReactNode;className?:string}){return <article className={`zx-native-card ${className}`}>{children}</article>}
export function MobileToolbar({children}:{children:ReactNode}){return <div className="zx-mobile-toolbar">{children}</div>}
export function MobileDataList({children}:{children:ReactNode}){return <div className="zx-mobile-data-list">{children}</div>}
export function MobileDataRow({title,meta,value,children}:{title:ReactNode;meta?:ReactNode;value?:ReactNode;children?:ReactNode}){return <article className="zx-mobile-data-row"><div className="zx-mobile-data-main"><b>{title}</b>{meta&&<small>{meta}</small>}</div>{value&&<strong>{value}</strong>}{children}</article>}
export function MobileBottomSheet({open,title,onClose,children}:{open:boolean;title:ReactNode;onClose:()=>void;children:ReactNode}){if(!open)return null;return <div className="zx-sheet-backdrop" onClick={onClose}><section className="zx-bottom-sheet" onClick={e=>e.stopPropagation()}><header><b>{title}</b><button onClick={onClose} aria-label="Close">×</button></header><div>{children}</div></section></div>}
export const mobileActionStyle:CSSProperties={minHeight:44,border:0,borderRadius:12,padding:"0 14px",fontWeight:650};


export function NativeFilterButton({label="Filter",count=0,onClick}:{label?:string;count?:number;onClick:()=>void}){
 return <button type="button" className="zx-filter-trigger" onClick={onClick}><span>⌕</span><b>{label}</b>{count>0&&<i>{count}</i>}</button>
}
export function NativeActionBar({children}:{children:ReactNode}){return <div className="zx-native-actionbar">{children}</div>}
export function NativeFullScreenSheet({open,title,onClose,children}:{open:boolean;title:ReactNode;onClose:()=>void;children:ReactNode}){
 if(!open)return null;return <div className="zx-native-modal-backdrop" onClick={onClose}><section className="zx-native-fullsheet" onClick={e=>e.stopPropagation()}><header><button type="button" onClick={onClose}>‹</button><b>{title}</b><span/></header><div className="zx-native-fullsheet-body">{children}</div></section></div>
}
export function ResponsiveRecordCard({title,subtitle,fields,actions}:{title:ReactNode;subtitle?:ReactNode;fields:Array<{label:ReactNode;value:ReactNode}>;actions?:ReactNode}){
 return <article className="zx-record-card"><header><div><b>{title}</b>{subtitle&&<small>{subtitle}</small>}</div>{actions}</header><dl>{fields.map((x,i)=><div key={i}><dt>{x.label}</dt><dd>{x.value}</dd></div>)}</dl></article>
}


export function NativeDetailSection({title,meta,children}:{title:ReactNode;meta?:ReactNode;children:ReactNode}){return <section className="zx-detail-section"><header><b>{title}</b>{meta&&<span>{meta}</span>}</header><div>{children}</div></section>}
export function NativeTransactionSummary({items,totalLabel,total}:{items:Array<{label:ReactNode;value:ReactNode}>;totalLabel?:ReactNode;total?:ReactNode}){return <div className="zx-transaction-summary">{items.map((x,i)=><div key={i}><span>{x.label}</span><b>{x.value}</b></div>)}{total!==undefined&&<div className="zx-transaction-total"><strong>{totalLabel||"Total"}</strong><strong>{total}</strong></div>}</div>}
export function NativeStatusPill({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){return <span className={`zx-status-pill zx-status-${tone}`}>{children}</span>}
export function NativeWorkflowActions({children}:{children:ReactNode}){return <div className="zx-workflow-actions">{children}</div>}


export type NativeViewState="loading"|"ready"|"empty"|"error";
export function NativeSearchFilterSheet({open,title="Filter",query,onQueryChange,onApply,onReset,onClose,children}:{open:boolean;title?:ReactNode;query:string;onQueryChange:(v:string)=>void;onApply:()=>void;onReset:()=>void;onClose:()=>void;children?:ReactNode}){
 if(!open)return null;return <div className="zx-sheet-backdrop" onClick={onClose}><section className="zx-bottom-sheet zx-search-filter-sheet" onClick={e=>e.stopPropagation()}><header><b>{title}</b><button type="button" onClick={onClose}>×</button></header><div className="zx-filter-body"><label className="zx-search-field"><span>⌕</span><input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search"/></label>{children}</div><footer className="zx-sheet-actions"><button type="button" onClick={onReset}>Reset</button><button type="button" className="zx-primary-action" onClick={onApply}>Apply</button></footer></section></div>
}
export function NativeDrillDown({open,title,onBack,children,actions}:{open:boolean;title:ReactNode;onBack:()=>void;children:ReactNode;actions?:ReactNode}){if(!open)return null;return <div className="zx-native-modal-backdrop"><section className="zx-native-fullsheet zx-drilldown"><header><button type="button" onClick={onBack}>‹</button><b>{title}</b><span/></header><div className="zx-native-fullsheet-body">{children}</div>{actions&&<footer className="zx-drilldown-actions">{actions}</footer>}</section></div>}
export function NativeTimeline({items}:{items:Array<{id?:string;title:ReactNode;description?:ReactNode;time?:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}>}){return <div className="zx-native-timeline">{items.map((x,i)=><article key={x.id||String(i)} className={`zx-timeline-item zx-timeline-${x.tone||"neutral"}`}><i/><div><header><b>{x.title}</b>{x.time&&<time>{x.time}</time>}</header>{x.description&&<p>{x.description}</p>}</div></article>)}</div>}
export function NativeConfirmSheet({open,title,description,confirmLabel="Confirm",cancelLabel="Cancel",danger=false,onConfirm,onClose}:{open:boolean;title:ReactNode;description?:ReactNode;confirmLabel?:ReactNode;cancelLabel?:ReactNode;danger?:boolean;onConfirm:()=>void;onClose:()=>void}){if(!open)return null;return <div className="zx-sheet-backdrop" onClick={onClose}><section className="zx-bottom-sheet zx-confirm-sheet" onClick={e=>e.stopPropagation()}><div className="zx-confirm-icon">!</div><h2>{title}</h2>{description&&<p>{description}</p>}<div className="zx-sheet-actions"><button type="button" onClick={onClose}>{cancelLabel}</button><button type="button" className={danger?"zx-danger-action":"zx-primary-action"} onClick={onConfirm}>{confirmLabel}</button></div></section></div>}
export function NativeStateView({state,title,description,onRetry,children}:{state:NativeViewState;title?:ReactNode;description?:ReactNode;onRetry?:()=>void;children?:ReactNode}){if(state==="ready")return <>{children}</>;if(state==="loading")return <div className="zx-state-view zx-state-loading"><i/><i/><i/></div>;return <div className={`zx-state-view zx-state-${state}`}><div className="zx-state-icon">{state==="empty"?"○":"!"}</div>{title&&<b>{title}</b>}{description&&<p>{description}</p>}{state==="error"&&onRetry&&<button type="button" onClick={onRetry}>Retry</button>}</div>}
