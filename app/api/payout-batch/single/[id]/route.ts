import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { decrypt } from "@/lib/crypto";
import { getPayoutAdapter, type PayoutInstruction } from "@/lib/payout";

/**
 * Admin-only download of a SINGLE payout's bank instruction. Lets an admin who
 * approves one payout outside the Friday batch still get the account details to
 * make the transfer. Generated on demand by decrypting the user's bank account.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const req = await prisma.payoutRequest.findUnique({ where: { id }, include: { user: true } });
  if (!req) return new Response("Not found", { status: 404 });

  let bank = "", accountNumber = "", accountType = "";
  if (req.user.bankAccountEnc) {
    try {
      const acct = JSON.parse(decrypt(req.user.bankAccountEnc)) as { bank: string; accountNumber: string; type?: string; accountType?: string };
      bank = acct.bank; accountNumber = acct.accountNumber; accountType = acct.type ?? acct.accountType ?? "";
    } catch { /* no details on file */ }
  }
  const instruction: PayoutInstruction = { reference: req.reference, beneficiaryName: req.user.fullName, bank, accountNumber, accountType, amountCents: req.amountCents };
  const { csv } = await getPayoutAdapter().process([instruction]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payout-${req.reference}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
