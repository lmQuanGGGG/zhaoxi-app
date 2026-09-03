import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";

const root=process.cwd();
const read=(file)=>readFileSync(join(root,file),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(`18.3.0 verification failed: ${message}`)};
const includesAll=(source,values,label)=>values.forEach(value=>assert(source.includes(value),`${label} missing: ${value}`));

const pkg=JSON.parse(read("package.json"));
assert(pkg.version==="18.3.0","root package version must be 18.3.0");
assert(pkg.scripts?.["verify:18.3.0"]==="node scripts/verify-release-18-3-0.mjs","release verifier script is missing");

const globals=read("apps/customer/app/globals.css");
const shell=read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss=read("apps/customer/app/_components/CustomerShell.module.css");
const home=read("apps/customer/app/_components/CustomerHome.tsx");
const homeCss=read("apps/customer/app/hub.module.css");
const ordersCss=read("apps/customer/app/orders.module.css");
const messages=read("apps/customer/app/messages/page.tsx");
const messageCss=read("apps/customer/app/customer-center.module.css");
const services=read("apps/customer/app/services/page.tsx");
const serviceHubCss=read("apps/customer/app/services/services-hub.module.css");
const serviceCss=read("apps/customer/app/services.module.css");
const requestCss=read("apps/customer/app/request.module.css");
const registry=read("apps/customer/app/_components/customer-service-presentation.ts");
const navigation=read("packages/platform/src/role-navigation.tsx");
const platform=read("packages/platform/src/index.tsx");
const topbar=read("packages/auth/src/index.tsx");

includesAll(globals,["--zx-bg:","--zx-bg-elevated:","--zx-surface:","--zx-surface-raised:","--zx-surface-soft:","--zx-text:","--zx-text-secondary:","--zx-border:","--zx-shadow-sm:","--zx-shadow-md:","--font-micro:400 10px","--font-caption:400 11px","--font-small:400 12px","--font-body-small:400 13px","--font-body:400 14px","--font-section-title:700 16px","--font-page-title:700 20px","--zx-type-hero-title:700 22px"],"compact semantic token");
assert(globals.includes('html[data-theme="dark"]'),"dark theme layer is missing");
assert(shell.includes('data-customer-shell="18.3.0"'),"Customer shell marker must be 18.3.0");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.3.0"'),"platform Customer architecture marker must be 18.3.0");
assert(topbar.includes('data-unified-top-bar="18.3.0"'),"shared top bar marker must be 18.3.0");
assert(navigation.includes('data-authoritative-bottom-navigation="18.3.0"'),"shared BottomNav marker must be 18.3.0");
includesAll(globals,["height:calc(50px + env(safe-area-inset-top))","width:30px;height:30px","height:calc(58px + env(safe-area-inset-bottom))","width:19px;height:19px","font:var(--font-bottom-nav)"],"compact shared chrome");
assert(shellCss.includes("calc(72px + env(safe-area-inset-bottom))"),"page content must reserve BottomNav space");
assert(homeCss.includes("height:40px")&&homeCss.includes("white-space:nowrap")&&homeCss.includes("text-overflow:ellipsis"),"single-line compact search invariant is missing");
assert(homeCss.includes("min-height:104px")&&homeCss.includes("grid-template-columns:repeat(4"),"compact Home hero/service geometry is missing");
assert(homeCss.includes("min-width:118px")&&homeCss.includes("max-width:138px"),"compact recommendation geometry is missing");
assert(ordersCss.includes("min-height:62px")&&ordersCss.includes("min-height:30px"),"compact Orders geometry is missing");
assert(messageCss.includes(".messageSearch")&&messages.includes("setQuery")&&messages.includes("toLocaleLowerCase"),"Messages search behavior is missing");
assert(serviceHubCss.includes("grid-template-columns:78px")&&serviceHubCss.includes("min-height:48px"),"Services rail geometry is missing");
assert(services.includes("getCustomerServicePresentation")&&home.includes("getCustomerServicePresentation"),"canonical service registry is not shared");
includesAll(registry,["food:","housing:","visa:","car-rental","translation:","travel:","payment:","community:","market:","emergency:"],"canonical service visual");
assert(serviceCss.includes("18.3.0 semantic compact service surfaces")&&requestCss.includes("18.3.0 compact semantic request flow"),"Life Service detail propagation is missing");

for(const route of ['href:"/"','href:"/orders"','href:"/services"','href:"/messages"','href:"/payment"'])assert(navigation.includes(route),`BottomNav route missing: ${route}`);
for(const endpoint of ["/api/customer-ui-config","/api/platform-modules","/api/customer-recommendations"])assert(home.includes(endpoint),`Home API capability missing: ${endpoint}`);
for(const route of ["page.tsx","orders/page.tsx","services/page.tsx","messages/page.tsx","payment/page.tsx","search/page.tsx","housing/page.tsx","travel/page.tsx"])assert(existsSync(join(root,"apps/customer/app",route)),`required Customer route missing: ${route}`);

console.log("ZhaoXi Customer 18.3.0 compact presentation system verified.");
