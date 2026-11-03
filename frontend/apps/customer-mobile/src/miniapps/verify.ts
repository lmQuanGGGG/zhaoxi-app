import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { manifestSigningPayload, type MiniAppManifest } from "@zhaoxi/miniapp-sdk";
import { trustedKeys } from "./keys";

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | BASE64.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * SHA-256 (hex) của bundle. Bundle được tải dưới dạng text UTF-8, nên mã hoá lại
 * ra đúng các byte đã ký (Metro luôn xuất UTF-8 không BOM).
 */
export function bundleHash(code: string): string {
  return bytesToHex(sha256(utf8ToBytes(code)));
}

export class MiniAppIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MiniAppIntegrityError";
  }
}

/**
 * Kiểm chữ ký Ed25519 của manifest. Bản release chỉ nhận khoá `prod`; bản
 * `__DEV__` nhận cả khoá `dev`, và chấp nhận manifest chưa ký (cảnh báo) để
 * build thử không cần khoá.
 */
export function verifyManifestSignature(manifest: MiniAppManifest): { signed: boolean } {
  if (!manifest.signature || !manifest.keyId) {
    if (__DEV__) {
      console.warn(`[miniapp] ${manifest.id}@${manifest.version} chưa ký: chỉ bản dev mới nạp.`);
      return { signed: false };
    }
    throw new MiniAppIntegrityError(`${manifest.id}@${manifest.version} chưa được ký`);
  }
  const key = trustedKeys.find((item) => item.keyId === manifest.keyId && (__DEV__ || item.env === "prod"));
  if (!key) throw new MiniAppIntegrityError(`Khoá ${manifest.keyId} không nằm trong danh sách tin cậy`);
  const ok = ed25519.verify(base64ToBytes(manifest.signature), utf8ToBytes(manifestSigningPayload(manifest)), base64ToBytes(key.publicKey));
  if (!ok) throw new MiniAppIntegrityError(`Chữ ký của ${manifest.id}@${manifest.version} không hợp lệ`);
  return { signed: true };
}

export function verifyBundleHash(manifest: MiniAppManifest, code: string) {
  const actual = bundleHash(code);
  if (actual !== manifest.sha256.toLowerCase()) throw new MiniAppIntegrityError(`Bundle ${manifest.id}@${manifest.version} sai hash (${actual.slice(0, 12)}… ≠ ${manifest.sha256.slice(0, 12)}…)`);
}
