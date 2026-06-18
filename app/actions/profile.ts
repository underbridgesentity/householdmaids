"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/password";
import { profileSchema, changePasswordSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export type ProfileState = { error?: string; ok?: boolean } | undefined;

/** Toggle the signed-in customer's marketing-email preference. */
export async function setMarketingPrefAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const optOut = String(formData.get("optOut") ?? "") === "1";
  await prisma.user.update({ where: { id: user.id }, data: { marketingOptOut: optOut } });
  await audit({ actorId: user.id, action: "marketing.pref", entity: "User", entityId: user.id, meta: { optOut } });
  revalidatePath("/app/profile/settings");
}

/** Update the signed-in user's own name, phone and email. */
export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const { fullName, email, phone } = parsed.data;
  const lower = email.toLowerCase();

  // Email must stay unique across users.
  if (lower !== (user.email ?? "").toLowerCase()) {
    const taken = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
    if (taken && taken.id !== user.id) return { error: "That email is already in use by another account." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { fullName, email: lower, phone: phone || null },
  });
  await audit({ actorId: user.id, action: "profile.updated", entity: "User", entityId: user.id });
  revalidatePath("/app/profile");
  revalidatePath("/app/profile/settings");
  return { ok: true };
}

/** Change the signed-in user's password (requires the current one). */
export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the password fields." };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser || !(await verifyPassword(dbUser.passwordHash, parsed.data.currentPassword))) {
    return { error: "Your current password is incorrect." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await audit({ actorId: user.id, action: "password.changed", entity: "User", entityId: user.id });
  return { ok: true };
}
