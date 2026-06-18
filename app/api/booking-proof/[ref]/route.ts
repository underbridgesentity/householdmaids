import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { readDocument } from "@/lib/storage";

function contentTypeFor(storageKey: string): string {
  const key = storageKey.replace(/\.enc$/, "").toLowerCase();
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/** ADMIN-only: streams a decrypted EFT proof-of-payment attached to a booking. */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { ref } = await params;
  const booking = await prisma.booking.findUnique({ where: { reference: ref }, select: { payment: { select: { proofKey: true } } } });
  const key = booking?.payment?.proofKey;
  if (!key) return new Response("Not found", { status: 404 });

  const bytes = await readDocument(key);
  const contentType = contentTypeFor(key);
  return new Response(new Blob([new Uint8Array(bytes)], { type: contentType }), {
    headers: { "Content-Type": contentType, "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
  });
}
