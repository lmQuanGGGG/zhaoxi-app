import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { integrationPreflightService } from "@/lib/services/integration-preflight-service";

type RuntimeCheck = { ok: boolean; code: string };

async function safeCheck(code: string, run: () => Promise<boolean>): Promise<RuntimeCheck> {
  try { return { ok: await run(), code }; }
  catch { return { ok: false, code }; }
}

export class RuntimeValidationService {
  async inspect() {
    const preflight = await integrationPreflightService.inspect();
    const db = getDb();

    const checks = await Promise.all([
      safeCheck("database_roundtrip", async () => {
        await db.execute(sql`select 1 as ok`);
        return true;
      }),
      safeCheck("auth_role_contract", async () => {
        const result = await db.execute(sql`
          select count(*)::int as invalid
          from auth_sessions
          where role not in ('customer','partner','admin','driver')
        `);
        return Number((result as any)?.[0]?.invalid ?? 0) === 0;
      }),
      safeCheck("wechat_role_contract", async () => {
        const result = await db.execute(sql`
          select count(*)::int as invalid
          from wechat_login_sessions
          where role not in ('customer','partner','admin','driver')
        `);
        return Number((result as any)?.[0]?.invalid ?? 0) === 0;
      }),
      safeCheck("session_expiry_contract", async () => {
        const result = await db.execute(sql`
          select count(*)::int as invalid
          from auth_sessions
          where access_expires_at > refresh_expires_at
        `);
        return Number((result as any)?.[0]?.invalid ?? 0) === 0;
      }),
      safeCheck("trusted_device_identity_contract", async () => {
        const result = await db.execute(sql`select count(*)::int as invalid from trusted_device_identities where status not in ('active','revoked')`);
        return Number((result as any)?.[0]?.invalid ?? 0) === 0;
      }),
      safeCheck("wechat_exchange_contract", async () => {
        const result = await db.execute(sql`
          select count(*)::int as invalid
          from wechat_login_sessions
          where exchanged_at is not null and exchange_code_hash is null
        `);
        return Number((result as any)?.[0]?.invalid ?? 0) === 0;
      }),
    ]);

    const runtimeReady = checks.every((item) => item.ok);
    return {
      ready: preflight.database && preflight.schema.ready && runtimeReady,
      stage: "production-runtime-validation",
      release: "19.0.0",
      preflight: {
        ready: preflight.ready,
        database: preflight.database,
        schemaReady: preflight.schema.ready,
        authenticationReady: preflight.authentication.ready,
      },
      runtime: {
        ready: runtimeReady,
        checks,
        failed: checks.filter((item) => !item.ok).map((item) => item.code),
      },
      contracts: {
        roles: ["customer", "partner", "admin", "driver"],
        sessionExchange: "/api/auth/session/exchange",
        wechatCallback: "/api/auth/wechat/callback",
        integrationPreflight: "/api/integration/preflight",
      },
      secretsExposed: false,
      timestamp: new Date().toISOString(),
    };
  }
}
export const runtimeValidationService = new RuntimeValidationService();
