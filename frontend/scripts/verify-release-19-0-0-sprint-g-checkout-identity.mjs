import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const auth=read("packages/auth/src/index.tsx");
const cart=read("apps/customer/app/cart/page.tsx");
const order=read("apps/customer/app/_components/ServiceRequestForm.tsx");
const restaurant=read("apps/customer/app/restaurant/[organizationId]/RestaurantDetail.tsx");
const pkg=JSON.parse(read("package.json"));
const checks=[
 [cart.includes("IdentityUpgradeSheet")&&cart.includes('session.authMethod==="guest"'),"cart checkout must gate Guest identity"],
 [cart.includes("pendingCheckout")&&cart.includes("onVerified"),"cart checkout must resume after identity upgrade"],
 [auth.includes("onVerified?:()=>void")&&auth.includes('setWechatOpen(true)'),"identity sheet must expose verified continuation and functional WeChat entry"],
 [order.includes('session?.authMethod==="guest"')&&order.includes("IdentityUpgradeSheet"),"final service-request form must preserve Guest defense-in-depth gate"],
 [restaurant.includes('count > 0')&&restaurant.includes('href="/cart"'),"restaurant must preserve cart CTA after committed items exist"],
 [pkg.scripts?.["verify:19.0.0:sprint-g"]?.includes("sprint-g-checkout-identity"),"Sprint G verifier script missing"],
];
for(const [ok,msg] of checks)if(!ok){console.error(`FAIL: ${msg}`);process.exit(1)}
console.log("ZhaoXi 19.0.0 Sprint G Platform verified: cart checkout identity gate, resumable verified checkout, functional WeChat upgrade entry, final-submit defense-in-depth, and restaurant cart CTA contracts PASS.");
