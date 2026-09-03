import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";

const root=process.cwd();
const read=(file)=>readFileSync(join(root,file),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(`18.2.1 verification failed: ${message}`)};
const pkg=JSON.parse(read("package.json"));
assert(pkg.version==="18.2.1","root package version must be 18.2.1");
assert(pkg.scripts?.["verify:18.2.1"]==="node scripts/verify-release-18-2-1.mjs","release verifier npm script is missing");

const shell=read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss=read("apps/customer/app/_components/CustomerShell.module.css");
const globals=read("apps/customer/app/globals.css");
const platform=read("packages/platform/src/index.tsx");
const navigation=read("packages/platform/src/role-navigation.tsx");
const topbar=read("packages/auth/src/index.tsx");
const icons=read("apps/customer/app/_components/CustomerIcon.tsx");
assert(shell.includes('data-customer-shell="18.2.1"')&&shell.includes("CustomerPageHeader"),"authoritative Customer shell must be marked 18.2.1");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.2.1"'),"platform must mount the 18.2.1 Customer architecture");
assert(topbar.includes('data-unified-top-bar="18.2.1"'),"unified top bar marker must be 18.2.1");
assert(navigation.includes('data-authoritative-bottom-navigation="18.2.1"'),"authoritative bottom navigation marker must be 18.2.1");
for(const route of ['href:"/"','href:"/orders"','href:"/services"','href:"/messages"','href:"/payment"'])assert(navigation.includes(route),`bottom navigation route missing: ${route}`);
assert(navigation.includes('role!=="customer"&&<button')&&!navigation.includes('aria-label={copy.more}>•••</button>\n {open&&'),"Customer floating overflow trigger must not render");
assert(icons.includes("CustomerIconName")&&icons.includes("<svg"),"shared Customer outline icon system is missing");
for(const token of ["--customer-glass","--customer-lavender","--customer-shadow-soft","safe-area-inset-bottom","overflow-x:clip"])assert((globals+shellCss).includes(token),`visual/responsive token missing: ${token}`);
assert(globals.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),"five-tab mobile navigation geometry is missing");

const screens=["_components/CustomerHome.tsx","_components/CustomerOrders.tsx","services/page.tsx","messages/page.tsx","notifications/CustomerNotificationCenter.tsx","payment/page.tsx","profile/page.tsx","khan-cap/page.tsx","support/page.tsx"];
for(const file of screens){const source=read(join("apps/customer/app",file));assert(source.includes("CustomerShell"),`${file} must use CustomerShell`);assert(!source.includes("<MiniTabBar"),`${file} must not mount duplicate navigation`)}
const services=read("apps/customer/app/services/page.tsx");
assert(services.includes("/api/platform-modules")&&services.includes("PersonalizedHomeFeed")&&services.includes("taxonomy"),"Service Hub must preserve API taxonomy and recommendations");
const home=read("apps/customer/app/_components/CustomerHome.tsx");
for(const endpoint of ["/api/customer-ui-config","/api/platform-modules","/api/customer-recommendations"])assert(home.includes(endpoint),`Home API capability missing: ${endpoint}`);
for(const file of ["_components/CustomerOrders.tsx","messages/page.tsx","notifications/CustomerNotificationCenter.tsx","payment/page.tsx","profile/page.tsx"]){assert(read(join("apps/customer/app",file)).includes("/api/"),`${file} no longer references its real API flow`)}
assert(read("apps/customer/app/support/page.tsx").includes('<SupportCenter role="customer"'),"Customer support must keep the production SupportCenter integration");
for(const route of ["page.tsx","orders/page.tsx","services/page.tsx","messages/page.tsx","notifications/page.tsx","payment/page.tsx","profile/page.tsx","search/page.tsx","support/page.tsx","khan-cap/page.tsx","housing/page.tsx","travel/page.tsx"]){assert(existsSync(join(root,"apps/customer/app",route)),`required Customer route missing: ${route}`)}
console.log("ZhaoXi Customer visual convergence 18.2.1 verified.");
