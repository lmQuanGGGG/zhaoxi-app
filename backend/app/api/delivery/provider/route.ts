import {json} from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(){
 return json({ok:true,data:{
   mode:"external_manual",
   driverAppDevelopment:false,
   providers:[],
   compatibility:{legacyDriverApis:true,autoDriverDispatch:false},
 }},{headers:{"cache-control":"no-store"}});
}
