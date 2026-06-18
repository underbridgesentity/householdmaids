import { promises as fs } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { encryptBytes, decryptBytes } from "@/lib/crypto";

/**
 * Storage for sensitive helper documents (ID, selfie, clearance).
 * Files are ENCRYPTED before they ever leave the server, so the backend store
 * (Vercel Blob — public-URL, or a local dir in dev) only ever holds ciphertext.
 * They're decrypted only when streamed through the ADMIN-gated route.
 *
 *  - If BLOB_READ_WRITE_TOKEN is set → Vercel Blob (works on serverless).
 *  - Otherwise → a private local dir under ./storage (dev; outside /public).
 */

// On Vercel the project filesystem is read-only, so the local fallback must use
// a writable temp dir. NOTE: temp storage is EPHEMERAL on serverless — configure
// BLOB_READ_WRITE_TOKEN (Vercel Blob) in production for durable document storage.
const STORAGE_ROOT = process.env.VERCEL
  ? path.join(os.tmpdir(), "hhm-helper-docs")
  : path.join(process.cwd(), "storage", "helper-docs");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export interface StoredFile {
  storageKey: string; // "blob:<url>" or "local:<relativePath>"
}

/**
 * Encrypts and stores an arbitrary file under a logical prefix (e.g.
 * "proof-of-payment", a helper id). Returns an opaque storageKey decoded by
 * readDocument. Used for helper documents AND payment/payout proofs.
 */
export async function storeEncryptedFile(prefix: string, filename: string, bytes: Buffer): Promise<StoredFile> {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9._/-]/g, "_");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const rel = `${safePrefix}/${crypto.randomUUID()}-${safe}.enc`;
  const ciphertext = encryptBytes(bytes);

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`files/${rel}`, ciphertext, {
      access: "public", // content is encrypted; URL is unguessable and never exposed to clients
      contentType: "application/octet-stream",
      addRandomSuffix: false,
    });
    return { storageKey: `blob:${blob.url}` };
  }

  const dest = path.join(STORAGE_ROOT, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, ciphertext);
  return { storageKey: `local:${rel}` };
}

/** Stores a helper vetting document (ID, selfie, …) under the helper's folder. */
export async function storeDocument(helperId: string, filename: string, bytes: Buffer): Promise<StoredFile> {
  return storeEncryptedFile(`helper-docs/${helperId}`, filename, bytes);
}

/** Validates a form file upload: image or PDF up to maxBytes. "" / missing → null, wrong → "invalid". */
export function validUpload(v: FormDataEntryValue | null, maxBytes = 8 * 1024 * 1024): File | null | "invalid" {
  if (!(v instanceof File) || v.size === 0) return null;
  const okType = v.type.startsWith("image/") || v.type === "application/pdf";
  if (!okType || v.size > maxBytes) return "invalid";
  return v;
}

export async function readDocument(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("blob:")) {
    const url = storageKey.slice(5);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Document not found");
    return decryptBytes(Buffer.from(await res.arrayBuffer()));
  }
  if (storageKey.startsWith("local:")) {
    const rel = storageKey.slice(6);
    const resolved = path.join(STORAGE_ROOT, rel);
    // Reject path traversal: the resolved path must stay within STORAGE_ROOT.
    const relCheck = path.relative(STORAGE_ROOT, resolved);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) throw new Error("Invalid key");
    return decryptBytes(await fs.readFile(resolved));
  }
  throw new Error("Unknown storage key");
}
