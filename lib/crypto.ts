import crypto from "crypto";

/**
 * App-level encryption for PII at rest (ID numbers, helper bank details).
 * AES-256-GCM with a key from ENCRYPTION_KEY (base64, 32 bytes).
 *
 * This protects sensitive fields even if the database is dumped. The key must
 * live only in the environment / a secrets manager — never in the DB or repo.
 */

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (base64).");
  }
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store iv:tag:ciphertext, all base64
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** Masks an account/ID number for display, e.g. "•••• 7781". */
export function maskTail(value: string, tail = 4): string {
  const digits = value.replace(/\s+/g, "");
  return "•••• " + digits.slice(-tail);
}
