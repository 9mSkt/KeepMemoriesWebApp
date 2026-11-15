import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireSecret } from "./env";

// ── AES-256-GCM for Google refresh tokens ────────────────────────────────────
// Stored as base64(iv[12] | tag[16] | ciphertext).

function encryptionKey(): Buffer {
  const key = Buffer.from(requireSecret("ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// ── HMAC-signed tokens (host session cookies, OAuth state) ───────────────────
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).

type Signed = { exp: number };

function hmac(data: string): Buffer {
  return createHmac("sha256", requireSecret("SESSION_SECRET")).update(data).digest();
}

export function sign<T extends object>(payload: T, ttlSeconds: number): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `${body}.${hmac(body).toString("base64url")}`;
}

export function verify<T extends object>(token: string | undefined): (T & Signed) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & Signed;
    return typeof payload.exp === "number" && payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}
