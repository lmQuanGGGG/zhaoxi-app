import { getDb } from "@/db";
import {
  authSessions,
  deliveryJobs,
  operationsAuditLogs,
  organizations,
  releaseAuditEvents,
  serviceRequests,
  users,
  wechatLoginSessions,
  qrPairingSessions,
} from "@/db/schema";
import { authPreflightService } from "@/lib/services/auth-preflight-service";

type Check = { ok: boolean; code: string };

async function tableCheck(name: string, query: () => Promise<unknown>): Promise<Check> {
  try {
    await query();
    return { ok: true, code: name };
  } catch {
    return { ok: false, code: name };
  }
}

export class IntegrationPreflightService {
  async inspect() {
    const db = getDb();
    const auth = await authPreflightService.inspect();

    const schemaChecks = await Promise.all([
      tableCheck("users", () => db.select({ id: users.id }).from(users).limit(1)),
      tableCheck("organizations", () => db.select({ id: organizations.id }).from(organizations).limit(1)),
      tableCheck("service_requests", () => db.select({ id: serviceRequests.id }).from(serviceRequests).limit(1)),
      tableCheck("delivery_jobs", () => db.select({ id: deliveryJobs.id }).from(deliveryJobs).limit(1)),
      tableCheck("qr_pairing_sessions", () => db.select({ id: qrPairingSessions.id }).from(qrPairingSessions).limit(1)),
      tableCheck("wechat_login_sessions", () => db.select({ id: wechatLoginSessions.id }).from(wechatLoginSessions).limit(1)),
      tableCheck("auth_sessions", () => db.select({ id: authSessions.id }).from(authSessions).limit(1)),
      tableCheck("release_audit_events", () => db.select({ id: releaseAuditEvents.id }).from(releaseAuditEvents).limit(1)),
      tableCheck("operations_audit_logs", () => db.select({ id: operationsAuditLogs.id }).from(operationsAuditLogs).limit(1)),
    ]);

    const schemaReady = schemaChecks.every((item) => item.ok);
    const routes = {
      auth: [
        "/api/auth/preflight",
        "/api/auth/qr/session",
        "/api/auth/qr/session/[id]",
        "/api/auth/qr/scan/[id]",
        "/api/auth/qr/exchange",
        "/api/auth/wechat/session",
        "/api/auth/wechat/session/[id]",
        "/api/auth/wechat/callback",
        "/api/auth/session/exchange",
        "/api/auth/session/me",
        "/api/auth/session/refresh",
        "/api/auth/session/logout",
        "/api/auth/session/logout-all",
      ],
      core: [
        "/api/organizations",
        "/api/services",
        "/api/service-requests",
        "/api/delivery/[requestId]",
        "/api/driver/jobs",
      ],
      operations: [
        "/api/release-audit",
        "/api/operations-audit",
        "/api/operations-command-center",
        "/api/health",
        "/api/readiness",
      ],
    };

    return {
      ready: schemaReady && auth.ready,
      stage: "production-integration",
      release: "19.0.0",
      database: auth.database,
      schema: {
        ready: schemaReady,
        checks: schemaChecks,
        missing: schemaChecks.filter((item) => !item.ok).map((item) => item.code),
      },
      authentication: {
        ready: auth.ready,
        wechat: auth.wechat,
        session: auth.session,
        missing: auth.missing,
        legacyAccountFallbackPresent: true,
        primaryLogin: auth.primaryLogin,
        wechatOptional: auth.wechatOptional,
      },
      contracts: {
        roles: ["customer", "partner", "admin", "driver"],
        routes,
        expectedPlatformApps: ["customer", "partner", "admin", "driver"],
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const integrationPreflightService = new IntegrationPreflightService();
