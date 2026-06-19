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
import { storeDocument } from "@/lib/storage";

const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8MB

/** Returns the File if it's a present, valid (type + size) upload, else null. */
function validDocFile(value: FormDataEntryValue | null): File | null | "invalid" {
  if (!(value instanceof File) || value.size === 0) return null;
  const okType = value.type.startsWith("image/") || value.type === "application/pdf";
  if (!okType || value.size > MAX_DOC_BYTES) return "invalid";
  return value;
}

export type HelperApplyState = { error?: string } | undefined;

/**
 * Submits a helper application. Creates the HELPER user + an IN_REVIEW
 * HelperProfile in a single transaction, encrypting PII (ID number + bank)
 * at rest. Does NOT auto-login, the helper is told to wait for vetting.
 */
export async function submitHelperApplicationAction(formData: FormData): Promise<HelperApplyState> {
  const ip = await clientIp();
  if (!(await rateLimit(`helperapply:${ip}`, 5, 60 * 60 * 1000))) {
    return { error: "Too many applications from this network. Please try again later." };
  }
  const parsed = helperApplicationSchema.safeParse({
    ...Object.fromEntries(formData),
    areaIds: formData.getAll("areaIds").map(String),
  });
  if (!parsed.success) return { error: "Please check your application details and try again." };
  const input = parsed.data;
  // Police-clearance consent is a compliance requirement, not a formality.
  if (!input.clearanceConsent) return { error: "We need your consent to run a police clearance to proceed." };
  const lower = input.email.toLowerCase();

  // Validate uploaded documents BEFORE creating any records.
  const idDoc = validDocFile(formData.get("idDoc"));
  const selfie = validDocFile(formData.get("selfie"));
  // The police-clearance certificate is optional (some applicants don't have one
  // yet — we run the check with their consent), but if supplied it must be valid.
  const clearanceDoc = validDocFile(formData.get("clearanceDoc"));
  if (idDoc === "invalid" || selfie === "invalid" || clearanceDoc === "invalid") {
    return { error: "Documents must be an image or PDF no larger than 8MB." };
  }

  // Reference contacts (first required, second optional).
  const references = [{ name: input.ref1Name, phone: input.ref1Phone, relationship: input.ref1Relationship || null }];
  if (input.ref2Name && input.ref2Phone) {
    references.push({ name: input.ref2Name, phone: input.ref2Phone, relationship: input.ref2Relationship || null });
  }

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return { error: "An account with this email already exists. Try signing in instead." };

  const passwordHash = await hashPassword(input.password);
  // Bank details are stored encrypted on BOTH the User (for payouts) and the
  // HelperProfile. The shape matches the referral payout reader: {bank, accountNumber, type}.
  const bankEnc = encrypt(
    JSON.stringify({ bank: input.bank, accountNumber: input.accountNumber, type: input.accountType }),
  );

  const { userId, profileId } = await prisma.$transaction(async (tx) => {
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

    const profile = await tx.helperProfile.create({
      data: {
        userId: user.id,
        idNumberEnc: encrypt(input.idNumber),
        yearsExperience: input.yearsExperience,
        status: "IN_REVIEW",
        bankAccountEnc: bankEnc,
        idUploaded: !!idDoc,
        selfieUploaded: !!selfie,
        referencesAdded: references.length > 0,
        clearanceConsent: input.clearanceConsent,
        areas: { connect: input.areaIds.map((id) => ({ id })) },
        references: { create: references },
      },
    });

    return { userId: user.id, profileId: profile.id };
  });

  // Encrypt + store the uploaded documents and link them to the profile.
  try {
    if (idDoc) {
      const bytes = Buffer.from(await idDoc.arrayBuffer());
      const { storageKey } = await storeDocument(profileId, idDoc.name, bytes);
      await prisma.helperDocument.create({
        data: { helperId: profileId, type: "ID_DOCUMENT", storageKey },
      });
    }
    if (selfie) {
      const bytes = Buffer.from(await selfie.arrayBuffer());
      const { storageKey } = await storeDocument(profileId, selfie.name, bytes);
      await prisma.helperDocument.create({
        data: { helperId: profileId, type: "SELFIE", storageKey },
      });
    }
    if (clearanceDoc) {
      const bytes = Buffer.from(await clearanceDoc.arrayBuffer());
      const { storageKey } = await storeDocument(profileId, clearanceDoc.name, bytes);
      await prisma.helperDocument.create({
        data: { helperId: profileId, type: "POLICE_CLEARANCE", storageKey },
      });
    }
  } catch {
    return { error: "We couldn't save your documents. Please try again." };
  }

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
