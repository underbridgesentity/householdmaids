import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        // Always run a verify to keep timing uniform for unknown emails.
        const ok = user
          ? await verifyPassword(user.passwordHash, password)
          : await verifyPassword(
              "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$0000000000000000000000000000000000000000000",
              password,
            );
        if (!user || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.checkedAt = Date.now();
        return token;
      }
      // Re-validate identity against the DB so a role change, rejection, or
      // account deletion takes effect (and name/email stay fresh). Throttled to
      // at most once per 60s per session — without this it was one DB round-trip
      // on EVERY request, the highest-frequency query in the app. A revoked
      // admin therefore loses access within a minute rather than instantly.
      const checkedAt = (token.checkedAt as number | undefined) ?? 0;
      if (token.id && Date.now() - checkedAt > 60_000) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, fullName: true, email: true },
        });
        if (!dbUser) return null; // user no longer exists -> invalidate session
        token.role = dbUser.role;
        token.name = dbUser.fullName;
        token.email = dbUser.email;
        token.checkedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
});
