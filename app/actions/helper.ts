"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { helperApplicationSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { encrypt } from "@/lib/crypto";
import { referralCodeFor } from "@/lib/reference";
import { advanceBooking } from "@/lib/booking";
import { audit } from "@/lib/audit";

/**
 * Submits a helper application. Creates the HELPER user + an IN_REVIEW
 * HelperProfile in a single transaction, encrypting PII (ID number + bank)
 * at rest. Does NOT auto-login — the helper is told to wait for vetting.
 */
export async function submitHelperApplicationAction(formData: FormData): Promise<void> {
  const parsed = helperApplicationSchema.safeParse({
    ...Object.fromEntries(formData),
    areaIds: formData.getAll("areaIds").map(String),
  });
  if (!parsed.success) throw new Error("Please check your application details.");
  const input = parsed.data;
  const lower = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await hashPassword(input.password);
  // Bank details are stored encrypted on BOTH the User (for payouts) and the
  // HelperProfile. The shape matches the referral payout reader: {bank, accountNumber, type}.
  const bankEnc = encrypt(
    JSON.stringify({ bank: input.bank, accountNumber: input.accountNumber, type: input.accountType }),
  );

  const userId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        email: lower,
        phone: input.phone,
        passwordHash,
        role: "HELPER",
        bankAccountEnc: bankEnc,
        referralCode: { create: { code: referralCodeFor(input.fullName) } },
      },
    });

    await tx.helperProfile.create({
      data: {
        userId: user.id,
        idNumberEnc: encrypt(input.idNumber),
        yearsExperience: input.yearsExperience,
        status: "IN_REVIEW",
        bankAccountEnc: bankEnc,
        idUploaded: true,
        selfieUploaded: true,
        referencesAdded: true,
        clearanceConsent: true,
        areas: { connect: input.areaIds.map((id) => ({ id })) },
      },
    });

    return user.id;
  });

  await audit({ actorId: userId, action: "helper.applied", entity: "HelperProfile", entityId: userId, meta: { email: lower } });
  redirect("/helper/submitted");
}

/** Advances a job the helper owns to its next lifecycle status. */
export async function advanceJobAction(reference: string): Promise<void> {
  const user = await assertRole("HELPER");
  const booking = await prisma.booking.findUnique({ where: { reference }, include: { helper: true } });
  if (!booking) throw new Error("Not found");
  if (booking.helper?.userId !== user.id) throw new Error("Not allowed");
  await advanceBooking(reference);
  revalidatePath(`/helper/jobs/${reference}`);
  revalidatePath("/helper/dashboard");
}
