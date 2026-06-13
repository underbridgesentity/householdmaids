import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
});

describe("crypto (PII at rest)", () => {
  it("encrypts and decrypts round-trip", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const secret = "9203150123088";
    const enc = encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(decrypt(enc)).toBe(secret);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    expect(encrypt("hello")).not.toBe(encrypt("hello"));
  });

  it("fails to decrypt tampered ciphertext (auth tag)", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto");
    const enc = encrypt("sensitive");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("masks account tails", async () => {
    const { maskTail } = await import("@/lib/crypto");
    expect(maskTail("62534887901")).toBe("•••• 7901");
  });
});

describe("payfast signature", () => {
  it("verifies a signature it generated", async () => {
    const { signPayfast, verifyItnSignature } = await import("@/lib/payfast");
    const data: Record<string, string> = { merchant_id: "10000100", amount: "495.00", item_name: "Clean", m_payment_id: "HM-1" };
    const signature = signPayfast(data, "passphrase");
    expect(verifyItnSignature({ ...data, signature }, "passphrase")).toBe(true);
  });

  it("rejects a tampered amount", async () => {
    const { signPayfast, verifyItnSignature } = await import("@/lib/payfast");
    const data: Record<string, string> = { merchant_id: "10000100", amount: "495.00", m_payment_id: "HM-1" };
    const signature = signPayfast(data, "passphrase");
    expect(verifyItnSignature({ ...data, amount: "5.00", signature }, "passphrase")).toBe(false);
  });

  it("rejects a malformed (wrong-length) signature without throwing", async () => {
    const { verifyItnSignature } = await import("@/lib/payfast");
    const data: Record<string, string> = { merchant_id: "10000100", amount: "495.00", signature: "abc" };
    expect(() => verifyItnSignature(data, "passphrase")).not.toThrow();
    expect(verifyItnSignature(data, "passphrase")).toBe(false);
  });
});
