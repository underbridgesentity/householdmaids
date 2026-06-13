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

export async function storeDocument(helperId: string, filename: string, bytes: Buffer): Promise<StoredFile> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const rel = `${helperId}/${crypto.randomUUID()}-${safe}.enc`;
  const ciphertext = encryptBytes(bytes);

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`helper-docs/${rel}`, ciphertext, {
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
