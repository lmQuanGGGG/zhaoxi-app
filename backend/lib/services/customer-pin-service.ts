import crypto from "node:crypto";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sessionService, type PublicAuthSession } from "@/lib/services/session-service";

const scrypt = promisify(crypto.scrypt);
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export class CustomerPinError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

function validPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

function normalizePhone(value: unknown) {
  const phone = String(value || "").replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : "";
}

async function hashPin(pin: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scrypt(pin, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

async function matchesPin(pin: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "base64url");
  const actual = await scrypt(pin, salt, expected.length) as Buffer;
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export class CustomerPinService {
  async set(session: PublicAuthSession | null, pin: unknown) {
    if (!session || (session.role !== "customer" && session.role !== "partner")) {
      throw new CustomerPinError("AUTH_REQUIRED", 401, "Authentication required.");
    }
    if (!validPin(pin)) {
      throw new CustomerPinError("PIN_INVALID", 422, "PIN must contain exactly 6 digits.");
    }
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user || user.isGuest || !user.phone) {
      throw new CustomerPinError("PHONE_VERIFICATION_REQUIRED", 403, "Verify a phone number before setting a PIN.");
    }
    await db.update(users).set({
      pinHash: await hashPin(pin),
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    return { configured: true };
  }

  async login(input: Record<string, unknown>) {
    const phone = normalizePhone(input.phone);
    const pin = input.pin;
    if (!phone || !validPin(pin)) {
      throw new CustomerPinError("LOGIN_INVALID", 422, "Phone number and 6-digit PIN are required.");
    }
    const db = getDb();
    const [user] = await db.select().from(users).where(and(eq(users.phone, phone), eq(users.status, "active"))).limit(1);
    if (!user || user.isGuest || !user.pinHash) {
      throw new CustomerPinError("LOGIN_FAILED", 401, "Invalid phone number or PIN.");
    }
    if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
      throw new CustomerPinError("PIN_LOCKED", 429, "Too many attempts. Try again later.");
    }
    if (!(await matchesPin(pin, user.pinHash))) {
      const attempts = user.pinFailedAttempts + 1;
      await db.update(users).set({
        pinFailedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
        pinLockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS) : null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));
      throw new CustomerPinError(attempts >= MAX_ATTEMPTS ? "PIN_LOCKED" : "LOGIN_FAILED", attempts >= MAX_ATTEMPTS ? 429 : 401, "Invalid phone number or PIN.");
    }
    await db.update(users).set({ pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: new Date() }).where(eq(users.id, user.id));
    return sessionService.issue({
      userId: user.id,
      role: input.role === "partner" ? "partner" : "customer",
      deviceId: typeof input.deviceId === "string" ? input.deviceId.slice(0, 180) : undefined,
      deviceName: typeof input.deviceName === "string" ? input.deviceName.slice(0, 180) : undefined,
    });
  }
}

export const customerPinService = new CustomerPinService();
