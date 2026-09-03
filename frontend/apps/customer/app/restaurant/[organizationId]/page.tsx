import RestaurantDetail from "./RestaurantDetail";
type Props={params:Promise<{organizationId:string}>};
export default async function Page({params}:Props){const {organizationId}=await params;return <RestaurantDetail organizationId={organizationId}/>}
