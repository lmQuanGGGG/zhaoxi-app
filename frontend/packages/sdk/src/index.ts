export type ApiEnvelope<T> = { ok: boolean; data: T; error?: { message?: string } | string; routing?: { mode: string; organizationId: string; organizationName?: string } };
export type RequestStatus = "new"|"reviewing"|"assigned"|"accepted"|"in_progress"|"waiting_customer"|"completed"|"cancelled"|"rejected";
export type ServiceRequestRow = { id:string; requestCode:string; status:RequestStatus; title:string; customerName:string; customerPhone:string; addressText?:string; latitude?:string; longitude?:string; serviceName?:string; moduleCode?:string; moduleName?:string; organizationName?:string; organizationCode?:string; details?:Record<string,unknown>; createdAt:string; updatedAt:string };
export type Organization = { id:string; code:string; name:string; type:string; metadata?:Record<string,unknown> };

async function decode<T>(responseOrPromise: Response | Promise<Response>): Promise<T> {
  const response = await responseOrPromise;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `API ${response.status}`;
    throw new Error(String(message));
  }
  return payload as T;
}

export function createZhaoXiSdk(baseUrl = "") {
  return {
    listRequests: (params: Record<string,string> = {}) => decode<ApiEnvelope<ServiceRequestRow[]>>(fetch(`${baseUrl}/api/platform-requests?${new URLSearchParams(params)}`, { cache:"no-store" })),
    updateStatus: (id:string,status:RequestStatus,note?:string,extra:Record<string,unknown>={}) => decode<ApiEnvelope<ServiceRequestRow>>(fetch(`${baseUrl}/api/platform-requests/${encodeURIComponent(id)}/status`, { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({status,note,...extra}) })),
    listOrganizations: () => decode<ApiEnvelope<Organization[]>>(fetch(`${baseUrl}/api/platform-organizations?status=active`, { cache:"no-store" })),
    listNotifications: (params:Record<string,string>) => decode<any>(fetch(`${baseUrl}/api/platform-notifications?${new URLSearchParams(params)}`, { cache:"no-store" })),
  };
}
