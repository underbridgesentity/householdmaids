import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

/**
 * Authorization guards. Used in middleware AND in every server action / route
 * (defence in depth) — never rely on the UI alone to gate access.
 */

export type SessionUser = { id: string; role: Role; name?: string | null; email?: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

/** Returns the user or redirects to login. Use in pages/actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the user if their role is allowed, else redirects. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    // Send each role to its own home rather than leaking a 403 surface.
    redirect(homeFor(user.role));
  }
  return user;
}

/** For server actions that must throw rather than redirect. */
export async function assertRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !roles.includes(user.role)) {
    throw new Error("Not authorized");
  }
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "HELPER":
      return "/helper/dashboard";
    default:
      return "/app";
  }
}
