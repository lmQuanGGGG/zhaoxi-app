import {NextResponse} from "next/server";
import {OTP_ADAPTER_CONTRACT,otpIdentityService} from "@/lib/services/otp-identity-service";
export const dynamic="force-dynamic";
export async function GET(){
  const otp=otpIdentityService.capabilities();
  const wechatConfigured=Boolean(process.env.WECHAT_OPEN_APP_ID&&process.env.WECHAT_OPEN_APP_SECRET&&(process.env.WECHAT_AUTH_CALLBACK_ORIGIN||process.env.ZHAOXI_BACKEND_PUBLIC_URL));
  return NextResponse.json({ok:true,data:{guestFirst:true,methods:{smsOtp:{available:otp.sms},whatsappOtp:{available:otp.whatsapp},wechatOAuth:{available:wechatConfigured}},otpAdapterContract:OTP_ADAPTER_CONTRACT,passwordCollection:{wechat:false,whatsapp:false}}},{headers:{"cache-control":"no-store"}});
}
