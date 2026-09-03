import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { weChatConfiguration } from "@/lib/auth-input";

export class HealthService {
  async checkDatabase() {
    const started = Date.now();
    try {
      await getDb().execute(sql`select 1 as ok`);
      return { ok:true, latencyMs:Date.now()-started };
    } catch (error) {
      return { ok:false, latencyMs:Date.now()-started, error:error instanceof Error ? error.message : "DATABASE_UNAVAILABLE" };
    }
  }
  configuration() {
    const wechat = weChatConfiguration();
    return {
      primaryLogin: "zhaoxi_qr",
      qrLogin: true,
      wechatLogin: wechat.configured,
      wechatLoginReason: wechat.configured ? "READY" : "OPTIONAL_NOT_CONFIGURED",
      wechatPay: Boolean(process.env.WECHAT_PAY_MCH_ID && process.env.WECHAT_PAY_APP_ID && process.env.WECHAT_PAY_API_V3_KEY),
      aiSupport: Boolean(process.env.ZHAOXI_AI_ASSIST_URL),
      database: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
    };
  }
}
export const healthService = new HealthService();
