import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { decrypt } from "@/lib/crypto";
import { getPayoutAdapter, type PayoutInstruction } from "@/lib/payout";

/**
 * Admin-only download of a payout cycle's bank-batch CSV. The file is
 * regenerated on demand from the cycle's payout rows (decrypting bank details
 * server-side), so nothing sensitive is stored at rest beyond the encrypted
 * account already on the user.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { cycleId } = await params;
  const cycle = await prisma.payoutCycle.findUnique({
    where: { id: cycleId },
    include: { requests: { include: { user: true } } },
  });
  if (!cycle || cycle.requests.length === 0) return new Response("Not found", { status: 404 });

  const instructions: PayoutInstruction[] = cycle.requests.map((req) => {
    let bank = "", accountNumber = "", accountType = "";
    if (req.user.bankAccountEnc) {
      try {
        const acct = JSON.parse(decrypt(req.user.bankAccountEnc)) as { bank: string; accountNumber: string; type?: string; accountType?: string };
        bank = acct.bank; accountNumber = acct.accountNumber; accountType = acct.type ?? acct.accountType ?? "";
      } catch { /* empty details */ }
    }
    return { reference: req.reference, beneficiaryName: req.user.fullName, bank, accountNumber, accountType, amountCents: req.amountCents };
  });

  const { csv } = await getPayoutAdapter().process(instructions);
  const filename = `payout-batch-${cycle.label.replace(/[^a-z0-9]+/gi, "-")}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
