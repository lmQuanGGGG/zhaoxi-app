import { NextResponse } from "next/server";
import { customerAccountService, CustomerAccountError } from "@/lib/services/customer-account-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const issued = await customerAccountService.loginOrRegister(body);
    return NextResponse.json(
      { ok: true, data: { ...issued, session: issued.session } },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof CustomerAccountError) {
      return NextResponse.json(
        { ok: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    console.error("Account login error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "ACCOUNT_LOGIN_FAILED", message: "Không thể đăng nhập bằng tài khoản." } },
      { status: 500 }
    );
  }
}
