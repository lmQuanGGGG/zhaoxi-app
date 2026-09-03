import crypto from "node:crypto";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sessionService } from "@/lib/services/session-service";

const scrypt = promisify(crypto.scrypt);

export class CustomerAccountError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

function normalizeEmail(value: unknown): string {
  const s = String(value || "").trim().toLowerCase();
  if (!s || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "";
  return s.slice(0, 255);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

async function matchesPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encoded] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export class CustomerAccountService {
  async loginOrRegister(input: Record<string, unknown>) {
    const email = normalizeEmail(input.email);
    const password = String(input.password || "").trim();
    const role = input.role === "partner" ? "partner" : "customer";
    const locale = String(input.locale || "vi-VN");

    if (!email) {
      throw new CustomerAccountError("EMAIL_INVALID", 422, "Email không đúng định dạng.");
    }
    if (password.length < 6) {
      throw new CustomerAccountError("PASSWORD_TOO_SHORT", 422, "Mật khẩu phải có ít nhất 6 ký tự.");
    }

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing) {
      if (existing.status !== "active") {
        throw new CustomerAccountError("ACCOUNT_DISABLED", 403, "Tài khoản hiện đang bị khóa.");
      }

      // If user has a passwordHash, verify it
      if (existing.passwordHash) {
        const matches = await matchesPassword(password, existing.passwordHash);
        if (!matches) {
          throw new CustomerAccountError("PASSWORD_INCORRECT", 401, "Mật khẩu không chính xác.");
        }
      } else {
        // First time setting password for this email
        await db
          .update(users)
          .set({
            passwordHash: await hashPassword(password),
            isGuest: false,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id));
      }

      const issued = await sessionService.issue({
        userId: existing.id,
        role,
        deviceId: typeof input.deviceId === "string" ? input.deviceId.slice(0, 180) : undefined,
        deviceName: typeof input.deviceName === "string" ? input.deviceName.slice(0, 180) : undefined,
      });

      const isDefaultName =
        !existing.nickname ||
        existing.nickname.includes("Guest") ||
        existing.nickname === "ZhaoXi Guest" ||
        existing.nickname === "Người dùng ZhaoXi";
      const needsProfile = isDefaultName || !existing.phone;

      return {
        ...issued,
        isNewUser: false,
        needsProfileCompletion: needsProfile,
      };
    }

    // Account does not exist -> Auto-create immediately without verification!
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(password),
        nickname: "Người dùng ZhaoXi",
        preferredLocale: ["zh-CN", "zh-TW", "vi-VN", "en-US"].includes(locale) ? locale : "vi-VN",
        isGuest: false,
        status: "active",
      })
      .returning();

    const issued = await sessionService.issue({
      userId: created.id,
      role,
      deviceId: typeof input.deviceId === "string" ? input.deviceId.slice(0, 180) : undefined,
      deviceName: typeof input.deviceName === "string" ? input.deviceName.slice(0, 180) : undefined,
    });

    return {
      ...issued,
      isNewUser: true,
      needsProfileCompletion: true,
    };
  }
}

export const customerAccountService = new CustomerAccountService();
