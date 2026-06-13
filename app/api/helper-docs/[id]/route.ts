import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { readDocument } from "@/lib/storage";

/** Infers a response content-type from the original extension in the storage key. */
function contentTypeFor(storageKey: string): string {
  const key = storageKey.replace(/\.enc$/, "").toLowerCase();
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/** ADMIN-only: streams a decrypted helper document inline for viewing. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const doc = await prisma.helperDocument.findUnique({ where: { id } });
  if (!doc) return new Response("Not found", { status: 404 });

  const bytes = await readDocument(doc.storageKey);
  const contentType = contentTypeFor(doc.storageKey);
  const body = new Blob([new Uint8Array(bytes)], { type: contentType });

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
