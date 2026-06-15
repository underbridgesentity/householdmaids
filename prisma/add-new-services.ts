/**
 * One-off, idempotent insert of the three new services (window cleaning,
 * extras-only, commercial window cleaning) WITHOUT touching existing services
 * or their admin-tuned prices. Safe to run against production after a schema
 * push. Re-running it does nothing once the services exist.
 *
 *   DATABASE_URL="<neon direct url>" npx tsx prisma/add-new-services.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_SERVICES = [
  { name: "Window Cleaning", emoji: "🪟", tint: "#e6f3fb", mode: "HOURS" as const, basePrice: 0, hourlyRate: 14000, minHours: 2, quoteOnly: false, description: "Streak-free windows, inside & out", sortOrder: 6 },
  { name: "Just the Extras", emoji: "🧺", tint: "#fbeef7", mode: "EXTRAS" as const, basePrice: 0, hourlyRate: 0, minHours: 1, quoteOnly: false, description: "Book ironing, laundry & more on their own", sortOrder: 7 },
  { name: "Commercial Window Cleaning", emoji: "🏙️", tint: "#e6f3fb", mode: "HOURS" as const, basePrice: 0, hourlyRate: 0, minHours: 1, quoteOnly: true, description: "Offices & large spaces, quoted to spec", sortOrder: 8 },
];

async function main() {
  for (const s of NEW_SERVICES) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (existing) {
      console.log(`• ${s.name} already exists, skipping`);
    } else {
      await prisma.service.create({ data: s });
      console.log(`✓ added ${s.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
