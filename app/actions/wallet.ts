"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { getWallet, appendLedger } from "@/lib/wallet";
import { withdrawSchema } from "@/lib/validation";
import { payoutReference } from "@/lib/reference";
import { encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const bankSchema = z.object({
  bank: z.string().min(2).max(60),
  accountNumber: z.string().min(4).max(30),
  accountType: z.string().min(2).max(30),
});

export async function saveBankAccountAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = bankSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid bank details");
  await prisma.user.update({
    where: { id: user.id },
    data: { bankAccountEnc: encrypt(JSON.stringify(parsed.data)) },
  });
  redirect("/app/withdraw");
}

/**
 * Requests a withdrawal. No minimum, no fee. The amount is validated against the
 * DERIVED available balance, the ledger is debited atomically, and a payout
 * request is queued for the weekly Friday run.
 */
export async function requestWithdrawalAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = withdrawSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid amount");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.bankAccountEnc) redirect("/app/withdraw/bank");
  const bank = JSON.parse(
    (await import("@/lib/crypto")).decrypt(dbUser.bankAccountEnc),
  ) as { bank: string; accountNumber: string; accountType: string };

  const reference = payoutReference();
  await prisma.$transaction(async (tx) => {
    const wallet = await getWallet(user.id);
    const amount = parsed.data.amountCents;
    if (amount <= 0 || amount > wallet.availableCents) {
      throw new Error("Amount exceeds available balance");
    }
    // Debit the ledger now (funds reserved out of available) …
    await appendLedger(tx, {
      userId: user.id,
      type: "WITHDRAWAL",
      amountCents: -amount,
      status: "PAID",
      ref: `Withdrawal ${reference}`,
    });
    // … and queue the payout for the Friday run.
    await tx.payoutRequest.create({
      data: {
        reference,
        userId: user.id,
        amountCents: amount,
        status: "REQUESTED",
        bankSnapshot: { bank: bank.bank, accountTail: bank.accountNumber.slice(-4), accountType: bank.accountType },
      },
    });
  });

  await audit({ actorId: user.id, action: "withdrawal.requested", entity: "PayoutRequest", entityId: reference, meta: { amountCents: parsed.data.amountCents } });
  redirect("/app/payouts?requested=1");
}
