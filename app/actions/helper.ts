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
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export type HelperApplyState = { error?: string } | undefined;

/**
 * Submits a helper application. Creates the HELPER user + an IN_REVIEW
 * HelperProfile in a single transaction, encrypting PII (ID number + bank)
 * at rest. Does NOT auto-login — the helper is told to wait for vetting.
 */
export async function submitHelperApplicationAction(formData: FormData): Promise<HelperApplyState> {
  const ip = await clientIp();
  if (!rateLimit(`helperapply:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many applications from this network. Please try again later." };
  }
  const parsed = helperApplicationSchema.safeParse({
    ...Object.fromEntries(formData),
    areaIds: formData.getAll("areaIds").map(String),
  });
  if (!parsed.success) return { error: "Please check your application details and try again." };
  const input = parsed.data;
  const lower = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return { error: "An account with this email already exists. Try signing in instead." };

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
