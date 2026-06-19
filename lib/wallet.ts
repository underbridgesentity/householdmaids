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
  // SQL aggregates (indexed on userId) instead of loading the whole ledger —
  // keeps this fast as a customer accumulates thousands of transactions.
  const [avail, pend, all] = await Promise.all([
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { userId, status: { in: ["EARNED", "PAID"] } } }),
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { userId, status: "PENDING", amountCents: { gt: 0 } } }),
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { userId, amountCents: { gt: 0 }, status: { not: "REVERSED" } } }),
  ]);
  return {
    availableCents: avail._sum.amountCents ?? 0,
    pendingCents: pend._sum.amountCents ?? 0,
    allTimeEarnedCents: all._sum.amountCents ?? 0,
  };
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
  const agg = await tx.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { userId: params.userId, status: { in: ["EARNED", "PAID"] } } });
  const available = agg._sum.amountCents ?? 0;
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
