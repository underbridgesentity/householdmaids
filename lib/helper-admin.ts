import crypto from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { referralCodeFor } from "@/lib/reference";

/**
 * Readable one-time password an admin shares with a manually-loaded helper.
 * Drawn from a large unambiguous alphabet (no 0/O/1/I/L) with real entropy:
 * 3 blocks of 4 chars = 12 chars over a 31-char set (~59 bits).
 */
export function tempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no easily-confused glyphs
  const block = () => {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  };
  return `HHM-${block()}-${block()}`;
}

export interface NewHelperInput {
  fullName: string;
  email: string;
  phone?: string;
  yearsExperience?: number;
  areaIds?: string[];
  approved?: boolean; // admin-vouched: skip self-vetting and go straight to APPROVED
}

/**
 * Creates a helper account from the admin side (single or bulk import). The
 * helper gets a temporary password to sign in and change; admin-loaded helpers
 * can be marked APPROVED immediately since the admin is vouching for them.
 */
export async function createHelperAccount(input: NewHelperInput): Promise<{ email: string; tempPassword: string }> {
  const lower = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) throw new Error(`An account already exists for ${lower}`);

  const pw = tempPassword();
  const passwordHash = await hashPassword(pw);

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        fullName: input.fullName.trim(),
        email: lower,
        phone: input.phone?.trim() || null,
        passwordHash,
        role: "HELPER",
        referralCode: { create: { code: referralCodeFor(input.fullName) } },
      },
    });
    await tx.helperProfile.create({
      data: {
        userId: u.id,
        yearsExperience: input.yearsExperience ?? 0,
        status: input.approved ? "APPROVED" : "IN_REVIEW",
        backgroundCheckPassed: !!input.approved,
        clearanceConsent: !!input.approved,
        ...(input.areaIds?.length ? { areas: { connect: input.areaIds.map((id) => ({ id })) } } : {}),
      },
    });
  });

  return { email: lower, tempPassword: pw };
}
