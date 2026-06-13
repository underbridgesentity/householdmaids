"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import { signupSchema, loginSchema } from "@/lib/validation";
import { referralCodeFor } from "@/lib/reference";
import { homeFor } from "@/lib/rbac";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export type AuthState = { error?: string } | undefined;

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
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
  if (!rateLimit(`login:${ip}`, 20, 15 * 60 * 1000)) {
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
