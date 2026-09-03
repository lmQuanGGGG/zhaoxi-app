import { failure, success } from "@/lib/core/api-response";
import { sessionService } from "@/lib/services/session-service";
import { wechatAuthService } from "@/lib/services/wechat-auth-service";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 try{const body=await request.json(); if(!body?.qrSessionId||!body?.exchangeCode)return failure("Missing exchange credentials.",422,undefined,"EXCHANGE_REQUIRED");
 const exchange=await wechatAuthService.consumeExchange({sessionId:String(body.qrSessionId),exchangeCode:String(body.exchangeCode)});
 if(!exchange.ok)return failure("Unable to exchange WeChat login.",401,undefined,exchange.errorCode);
 return success(await sessionService.issue({userId:exchange.userId,role:exchange.role,organizationId:exchange.organizationId,deviceId:body?.deviceId?String(body.deviceId):undefined,deviceName:body?.deviceName?String(body.deviceName).slice(0,180):undefined}));
 }catch(error){console.error(error);return failure("Unable to create authentication session.",500,undefined,"SESSION_EXCHANGE_FAILED");}
}
