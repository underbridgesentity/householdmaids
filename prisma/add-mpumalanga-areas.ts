/**
 * One-off, idempotent insert of the Mpumalanga service areas so customers there
 * can pick their area at booking. Safe to run against production; re-running
 * does nothing once they exist.
 *
 *   DATABASE_URL="<neon direct url>" npx tsx prisma/add-mpumalanga-areas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MPUMALANGA = ["Middelburg", "eMalahleni (Witbank)", "Secunda"];

async function main() {
  for (const name of MPUMALANGA) {
    const existing = await prisma.area.findUnique({ where: { name } });
    if (existing) {
      console.log(`• ${name} already exists, skipping`);
    } else {
      await prisma.area.create({ data: { name } });
      console.log(`✓ added ${name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
