import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Storage adapter for helper documents (ID, selfie, clearance, references).
 * Default = local private folder outside /public so files are never web-served
 * directly; access goes through an authorized route that streams the bytes.
 * Swap for an S3-compatible adapter in production.
 */

const STORAGE_ROOT = path.join(process.cwd(), "storage", "helper-docs");

export interface StoredFile {
  storageKey: string;
}

export async function storeDocument(
  helperId: string,
  filename: string,
  bytes: Buffer,
): Promise<StoredFile> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${helperId}/${crypto.randomUUID()}-${safe}`;
  const dest = path.join(STORAGE_ROOT, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  return { storageKey: key };
}

export async function readDocument(storageKey: string): Promise<Buffer> {
  // Prevent path traversal.
  const resolved = path.join(STORAGE_ROOT, storageKey);
  if (!resolved.startsWith(STORAGE_ROOT)) throw new Error("Invalid key");
  return fs.readFile(resolved);
}
