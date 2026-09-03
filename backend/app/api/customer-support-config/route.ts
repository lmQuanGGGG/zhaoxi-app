import {authenticatedSession} from "@/lib/auth-request";
import {failure,success} from "@/lib/core/api-response";
import {customerSupportSettingsService} from "@/lib/services/customer-support-settings-service";
export const dynamic="force-dynamic";
export async function GET(){try{return success(await customerSupportSettingsService.get())}catch(error){console.error(error);return failure("Unable to load support configuration.",500,undefined,"SUPPORT_CONFIG_LOAD_FAILED")}}
export async function PATCH(r:Request){const s=await authenticatedSession(r);if(!s||s.role!=="admin")return failure("Admin required.",403,undefined,"ADMIN_REQUIRED");try{return success(await customerSupportSettingsService.update(await r.json().catch(()=>({})),s.userId))}catch(error){console.error(error);return failure("Unable to update support configuration.",500,undefined,"SUPPORT_CONFIG_UPDATE_FAILED")}}
