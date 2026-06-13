"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import { signupSchema, loginSchema } from "@/lib/validation";
import { referralCodeFor } from "@/lib/reference";
import { homeFor } from "@/lib/rbac";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export type ResetRequestState = { sent?: boolean } | undefined;
export type ResetState = { error?: string } | undefined;

/** Step 1: email a password-reset link. Always returns the same generic result
 *  (no account enumeration). The raw token is emailed; only its hash is stored. */
export async function requestPasswordResetAction(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const ip = await clientIp();
  // Rate-limited, but still return the generic response so timing/output don't leak.
  const allowed = await rateLimit(`pwreset:${ip}`, 5, 60 * 60 * 1000);
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (allowed && z.string().email().safeParse(email).success) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
      await sendEmail({
        to: user.email,
        subject: "Reset your Household Maids password",
        text: `Hi ${user.fullName},\n\nWe received a request to reset your password. Use this link within 1 hour:\n${base}/reset/${token}\n\nIf you didn't request this, you can safely ignore this email.`,
      });
      await audit({ actorId: user.id, action: "password.reset.requested", entity: "User", entityId: user.id });
    }
  }
  return { sent: true };
}

/** Step 2: set the new password using a valid, unexpired, unused token. */
export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // Invalidate any other outstanding reset tokens for this user.
    prisma.passwordResetToken.deleteMany({ where: { userId: rec.userId, usedAt: null } }),
  ]);
  await audit({ actorId: rec.userId, action: "password.reset.completed", entity: "User", entityId: rec.userId });
  redirect("/login?reset=1");
}

export type AuthState = { error?: string } | undefined;

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000))) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const { fullName, email, phone, password, referralCode } = parsed.data;
  const lower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return { error: "An account with this email already exists." };

  // Resolve referral code (if any) before creating the user.
  const code = referralCode?.trim();
  const referrerCode = code
    ? await prisma.referralCode.findUnique({ where: { code: code.toUpperCase() }, include: { owner: true } })
    : null;

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email: lower,
        phone: phone || null,
        passwordHash,
        role: "CUSTOMER",
        referralCode: { create: { code: referralCodeFor(fullName) } },
      },
    });

    // A valid, distinct referral code creates a PENDING referral. The reward is
    // only EARNED once the referee's first booking is actually paid (via ITN).
    if (referrerCode && referrerCode.ownerId !== user.id) {
      await tx.referral.create({
        data: {
          codeId: referrerCode.id,
          referrerId: referrerCode.ownerId,
          refereeId: user.id,
          status: "PENDING",
        },
      });
    }
  });

  await signIn("credentials", { email: lower, password, redirectTo: "/app" });
  return undefined; // signIn redirects
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 20, 15 * 60 * 1000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const target = user ? homeFor(user.role) : "/app";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: target,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error; // re-throw redirect
  }
  return undefined;
}

export async function logoutAction() {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
  redirect("/");
}
