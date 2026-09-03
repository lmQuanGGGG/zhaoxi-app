import fs from"node:fs";
const req=["SPRINT_16_43.md","SPRINT_16_44.md","lib/services/travel-inquiry-service.ts","app/api/travel-inquiries/route.ts"];
for(const f of req)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));if(pkg.version!=="16.44.0")throw new Error("Backend version must be 16.44.0");
for(const x of["verify:16.44","typecheck","build"])if(!pkg.scripts?.[x])throw new Error(`Missing ${x}`);
const s=fs.readFileSync("lib/services/travel-inquiry-service.ts","utf8");
for(const m of['eq(modules.code,"travel")',"TRAVEL_EXPERIENCE_NOT_FOUND","TRAVEL_PARTNER_UNAVAILABLE","travel_experience_inquiry","travelLead:true","paymentRequired:false","requestedDate","maxGuests","travel_partner_lead"])
 if(!s.includes(m))throw new Error(`Missing Travel inquiry marker ${m}`);
const r=fs.readFileSync("app/api/travel-inquiries/route.ts","utf8");if(!r.includes("travelInquiryService.create")||!r.includes("{status:201}"))throw new Error("Travel inquiry API contract missing");
console.log("Sprint 16.44 Backend Tour & Local Experience Marketplace Foundation structure is valid.");