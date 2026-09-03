import ServiceBrowser from "../../_components/ServiceBrowser";import TravelBrowser from "../../du-lich/TravelBrowser";
type Props={params:Promise<{module:string}>};
export default async function Page({params}:Props){const{module}=await params;return module==="travel"?<TravelBrowser/>:<ServiceBrowser moduleCode={module}/>}
