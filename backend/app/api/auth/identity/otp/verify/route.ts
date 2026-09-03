import { authenticatedSession } from "@/lib/auth-request";
import { failure, success } from "@/lib/core/api-response";
import { OtpIdentityError, otpIdentityService } from "@/lib/services/otp-identity-service";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{const session=await authenticatedSession(request);const body=await request.json().catch(()=>({}));return success(await otpIdentityService.verify(session,body));}catch(error){if(error instanceof OtpIdentityError)return failure(error.message,error.status,undefined,error.code);console.error(error);return failure("Unable to verify OTP.",500,undefined,"OTP_VERIFY_FAILED");}}
