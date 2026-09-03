import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { weChatConfiguration } from "@/lib/auth-input";

const ROLES = ["customer", "partner", "admin", "driver"] as const;

export class AuthPreflightService {
  async inspect() {
    const wechat = weChatConfiguration();
    let database = false;
    try {
      await getDb().execute(sql`select 1 as ok`);
      database = true;
    } catch {
      database = false;
    }
    return {
      ready: database,
      primaryLogin: "zhaoxi_qr",
      wechatOptional: true,
      database,
      wechat: {
        configured: wechat.configured,
        credentialsConfigured: wechat.credentials,
        callbackConfigured: wechat.callbackConfigured,
        callbackOrigin: wechat.callbackOrigin,
        callbackPath: "/api/auth/wechat/callback",
        roles: ROLES,
      },
      session: {
        accessTtlMinutes: 15,
        refreshTtlDays: { customer: 30, partner: 14, admin: 1, driver: 7 },
        cookieNames: ["zx_access_v2", "zx_refresh_v2"],
      },
      missing: wechat.missing,
    };
  }
}

export const authPreflightService = new AuthPreflightService();
