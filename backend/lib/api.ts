import { failure, json as foundationJson } from "@/lib/core/api-response";
export const json = foundationJson;
export function errorResponse(message:string,status=400,details?:unknown){return failure(message,status,details);}
