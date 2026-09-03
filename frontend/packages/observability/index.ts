export type ZhaoXiApp="customer"|"partner"|"admin"|"driver";
export type RuntimeSeverity="info"|"warning"|"error"|"critical";
export type RuntimeEvent={id:string;app:ZhaoXiApp|"backend";environment:string;severity:RuntimeSeverity;eventType:string;message:string;digest?:string|null;route?:string|null;release:string;createdAt:string;resolvedAt?:string|null;metadata?:Record<string,unknown>};
export type IncidentSummary={generatedAt:string;hours:number;total:number;unresolved:number;critical:number;error:number;byApp:Array<{app:string;count:number}>;bySeverity:Array<{severity:string;count:number}>;byType:Array<{eventType:string;count:number}>;recent:RuntimeEvent[]};
export async function reportRuntimeError(app:ZhaoXiApp,error:Error & {digest?:string},metadata:Record<string,unknown>={}){
  try{await fetch('/api/platform-events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({app,severity:'error',eventType:'runtime_error',message:error.message||'Runtime error',digest:error.digest,route:typeof location!=='undefined'?location.pathname:undefined,release:'15.1.0',metadata}),keepalive:true})}catch{/* observability must never break the app */}
}
