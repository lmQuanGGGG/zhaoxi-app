import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";

const root=process.cwd();
const read=(file)=>readFileSync(join(root,file),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(`18.2.0 verification failed: ${message}`)};
const packageJson=JSON.parse(read("package.json"));
assert(packageJson.version==="18.2.0","root package version must be 18.2.0");
assert(packageJson.scripts?.["verify:18.2.0"]==="node scripts/verify-release-18-2-0.mjs","release verifier npm script is missing");

const shell=read("apps/customer/app/_components/CustomerShell.tsx");
const shellCss=read("apps/customer/app/_components/CustomerShell.module.css");
const platform=read("packages/platform/src/index.tsx");
const navigation=read("packages/platform/src/role-navigation.tsx");
const topbar=read("packages/auth/src/index.tsx");
const legacyNavigationCss=read("apps/customer/app/_components/MiniTabBar.module.css");
assert(shell.includes('data-customer-shell="18.2.0"')&&shell.includes("CustomerPageHeader"),"authoritative Customer shell and contextual header must exist");
assert(topbar.includes('data-unified-top-bar="18.2.0"'),"UnifiedTopBar marker must exist");
assert(navigation.includes('data-authoritative-bottom-navigation="18.2.0"')&&navigation.includes('href:"/services"'),"authoritative bottom navigation must target the Service Hub");
assert(legacyNavigationCss.includes(".bar{display:none}"),"legacy Customer bottom navigation must not compete with the authoritative navigation");
assert(platform.includes('data-customer-architecture={role==="customer"?"18.2.0"'),"Customer architecture marker must be mounted by the shared platform shell");
for(const token of ["--customer-surface","--customer-primary","env(safe-area-inset-bottom)","overflow-x:auto","clamp("])assert(shellCss.includes(token),`design/responsive token missing: ${token}`);

const screens=[
 "apps/customer/app/_components/CustomerHome.tsx",
 "apps/customer/app/_components/CustomerOrders.tsx",
 "apps/customer/app/services/page.tsx",
 "apps/customer/app/messages/page.tsx",
 "apps/customer/app/notifications/CustomerNotificationCenter.tsx",
 "apps/customer/app/payment/page.tsx",
 "apps/customer/app/account/page.tsx",
 "apps/customer/app/profile/page.tsx",
 "apps/customer/app/profile/security/page.tsx",
];
for(const file of screens)assert(read(file).includes("CustomerShell"),`${file} must use the shared Customer shell`);
for(const file of screens)assert(!read(file).includes("<MiniTabBar"),`${file} must not mount a duplicate bottom navigation`);

const routes=["page.tsx","orders/page.tsx","services/page.tsx","messages/page.tsx","notifications/page.tsx","payment/page.tsx","profile/page.tsx","account/page.tsx","search/page.tsx","support/page.tsx","housing/page.tsx","travel/page.tsx"];
for(const route of routes)assert(existsSync(join(root,"apps/customer/app",route)),`required Customer route missing: /${route.replace(/\/page\.tsx$/,"")}`);
const activeArchitecture=[shell,shellCss,platform,navigation,topbar,...screens.map(read)].join("\n");
assert(!activeArchitecture.includes("18.1.2"),"18.1.2 remains active in the Customer architecture");
console.log("ZhaoXi Customer architecture 18.2.0 verified.");
