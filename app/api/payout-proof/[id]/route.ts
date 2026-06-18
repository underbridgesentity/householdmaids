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

/**
 * Streams a payout's proof-of-payment. Visible to an ADMIN or to the payout's
 * OWNER (the affiliate). Falls back to the batch-level proof on the cycle.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const payout = await prisma.payoutRequest.findUnique({ where: { id }, select: { userId: true, proofKey: true, cycle: { select: { proofKey: true } } } });
  if (!payout) return new Response("Not found", { status: 404 });
  if (user.role !== "ADMIN" && user.id !== payout.userId) return new Response("Forbidden", { status: 403 });

  const key = payout.proofKey ?? payout.cycle?.proofKey;
  if (!key) return new Response("Not found", { status: 404 });

  const bytes = await readDocument(key);
  const contentType = contentTypeFor(key);
  return new Response(new Blob([new Uint8Array(bytes)], { type: contentType }), {
    headers: { "Content-Type": contentType, "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
  });
}
