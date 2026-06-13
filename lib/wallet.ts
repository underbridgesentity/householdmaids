import { prisma } from "@/lib/db";
import type { Prisma, WalletTxnType, WalletTxnStatus } from "@prisma/client";

/**
 * Wallet = an append-only ledger. The available balance is always DERIVED from
 * transactions, never stored as a mutable field — this keeps money integrity
 * auditable. Amounts are signed integer cents.
 *
 *  - available  = Σ amount where status ∈ {EARNED, PAID}  (credits earned, debits paid out)
 *  - pending    = Σ amount where status = PENDING and amount > 0 (rewards not yet cleared)
 *  - allTime    = Σ positive credits ever recorded
 */

export interface WalletSummary {
  availableCents: number;
  pendingCents: number;
  allTimeEarnedCents: number;
}

export async function getWallet(userId: string): Promise<WalletSummary> {
  const txns = await prisma.walletTransaction.findMany({ where: { userId } });
  let available = 0;
  let pending = 0;
  let allTime = 0;
  for (const t of txns) {
    if (t.status === "EARNED" || t.status === "PAID") available += t.amountCents;
    if (t.status === "PENDING" && t.amountCents > 0) pending += t.amountCents;
    if (t.amountCents > 0 && t.status !== "REVERSED") allTime += t.amountCents;
  }
  return { availableCents: available, pendingCents: pending, allTimeEarnedCents: allTime };
}

/** Appends a ledger entry inside an existing transaction, stamping balanceAfter. */
export async function appendLedger(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    type: WalletTxnType;
    amountCents: number;
    status: WalletTxnStatus;
    ref?: string;
  },
): Promise<void> {
  const prior = await tx.walletTransaction.findMany({ where: { userId: params.userId } });
  const available = prior.reduce(
    (sum, t) => (t.status === "EARNED" || t.status === "PAID" ? sum + t.amountCents : sum),
    0,
  );
  const counts = params.status === "EARNED" || params.status === "PAID";
  const balanceAfter = counts ? available + params.amountCents : available;
  await tx.walletTransaction.create({
    data: {
      userId: params.userId,
      type: params.type,
      amountCents: params.amountCents,
      status: params.status,
      balanceAfter,
      ref: params.ref,
    },
  });
}
