import { NextResponse } from "next/server";
import { customerPinService, CustomerPinError } from "@/lib/services/customer-pin-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const issued = await customerPinService.login(body);
    return NextResponse.json({ ok: true, data: { ...issued, session: issued.session } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof CustomerPinError) return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status });
    console.error(error);
    return NextResponse.json({ ok: false, error: { code: "PIN_LOGIN_FAILED", message: "Unable to sign in." } }, { status: 500 });
  }
}
