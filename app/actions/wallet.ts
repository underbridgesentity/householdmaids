"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { appendLedger } from "@/lib/wallet";
import { withdrawSchema } from "@/lib/validation";
import { payoutReference } from "@/lib/reference";
import { encrypt, decrypt } from "@/lib/crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const bankSchema = z.object({
  bank: z.string().min(2).max(60),
  accountNumber: z.string().min(4).max(30),
  accountType: z.string().min(2).max(30),
});

export type WithdrawState = { error?: string } | undefined;

export async function saveBankAccountAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = bankSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid bank details");
  // Canonical bank blob shape: { bank, accountNumber, type } — matches the helper
  // writer and the admin payout reader.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bankAccountEnc: encrypt(
        JSON.stringify({ bank: parsed.data.bank, accountNumber: parsed.data.accountNumber, type: parsed.data.accountType }),
      ),
    },
  });
  redirect("/app/withdraw");
}

/**
 * Requests a withdrawal. No minimum, no fee. Runs at SERIALIZABLE isolation with
 * retry so two concurrent requests can't both read the same balance and overdraw
 * the wallet (the available balance is derived from the ledger, not a stored field).
 */
export async function requestWithdrawalAction(_prev: WithdrawState, formData: FormData): Promise<WithdrawState> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const ip = await clientIp();
  if (!rateLimit(`withdraw:${user.id}:${ip}`, 10, 60 * 60 * 1000)) {
    return { error: "Too many withdrawal requests. Please try again later." };
  }
  const parsed = withdrawSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid amount." };
  const amount = parsed.data.amountCents;
  if (amount <= 0) return { error: "Enter a valid amount." };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.bankAccountEnc) redirect("/app/withdraw/bank");
  const bank = JSON.parse(decrypt(dbUser.bankAccountEnc)) as { bank: string; accountNumber: string; type?: string; accountType?: string };
  const accountType = bank.type ?? bank.accountType ?? "Cheque";

  const reference = payoutReference();

  // Serializable transaction with bounded retry on write-conflict (P2034).
  let attempt = 0;
  for (;;) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const txns = await tx.walletTransaction.findMany({ where: { userId: user.id } });
          const available = txns.reduce(
            (sum, t) => (t.status === "EARNED" || t.status === "PAID" ? sum + t.amountCents : sum),
            0,
          );
          if (amount > available) return { error: `You can withdraw up to R${Math.round(available / 100)}.` };

          await appendLedger(tx, {
            userId: user.id,
            type: "WITHDRAWAL",
            amountCents: -amount,
            status: "PAID",
            ref: `Withdrawal ${reference}`,
          });
          await tx.payoutRequest.create({
            data: {
              reference,
              userId: user.id,
              amountCents: amount,
              status: "REQUESTED",
              bankSnapshot: { bank: bank.bank, accountTail: bank.accountNumber.slice(-4), accountType },
            },
          });
          return { ok: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if ("error" in result && result.error) return { error: result.error };
      break;
    } catch (e) {
      // Retry on serialization failure / write conflict, else rethrow.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 3) {
        attempt += 1;
        continue;
      }
      throw e;
    }
  }

  await audit({ actorId: user.id, action: "withdrawal.requested", entity: "PayoutRequest", entityId: reference, meta: { amountCents: amount } });
  redirect("/app/payouts?requested=1");
}
