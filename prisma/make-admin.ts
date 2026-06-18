/**
 * Promotes an existing user to the ADMIN role (so they can use /admin). The
 * person must have signed up first. Run against production with the Neon URL:
 *
 *   DATABASE_URL="<neon url>" npx tsx prisma/make-admin.ts you@example.com
 *
 * To demote back to a normal customer, pass a second arg:
 *   DATABASE_URL="<neon url>" npx tsx prisma/make-admin.ts you@example.com CUSTOMER
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const role = (process.argv[3] ?? "ADMIN").toUpperCase();
  if (!email) {
    console.error("Usage: npx tsx prisma/make-admin.ts <email> [ADMIN|CUSTOMER|HELPER]");
    process.exit(1);
  }
  if (!["ADMIN", "CUSTOMER", "HELPER"].includes(role)) {
    console.error(`Invalid role "${role}". Use ADMIN, CUSTOMER or HELPER.`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, fullName: true } });
  if (!user) {
    console.error(`No account found for ${email}. Sign up at /signup first, then re-run.`);
    process.exit(1);
  }
  if (user.role === role) {
    console.log(`${email} (${user.fullName}) is already ${role}.`);
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: role as "ADMIN" | "CUSTOMER" | "HELPER" } });
  console.log(`✓ ${email} (${user.fullName}) is now ${role}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
