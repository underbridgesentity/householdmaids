import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { encrypt } from "../lib/crypto";

const prisma = new PrismaClient();

const AREAS = [
  "Sandton", "Midrand", "Centurion", "Pretoria East", "Pretoria CBD",
  "Kempton Park", "Benoni", "Boksburg", "Roodepoort", "Randburg",
  "Fourways", "Soweto", "Alberton", "Edenvale", "Germiston",
];

const SERVICES = [
  { name: "Standard Clean", emoji: "🧹", tint: "#efe5f6", mode: "ROOMS" as const, basePrice: 32000, hourlyRate: 0, minHours: 1, description: "Everyday tidy of your whole home", sortOrder: 1 },
  { name: "Deep Clean", emoji: "✨", tint: "#fbe9f5", mode: "ROOMS" as const, basePrice: 62000, hourlyRate: 0, minHours: 1, description: "Top-to-bottom intensive cleaning", sortOrder: 2 },
  { name: "Move In / Out", emoji: "📦", tint: "#e8e8fb", mode: "ROOMS" as const, basePrice: 78000, hourlyRate: 0, minHours: 1, description: "Empty-home detailed clean", sortOrder: 3 },
  { name: "Office Clean", emoji: "🏢", tint: "#e6f3fb", mode: "HOURS" as const, basePrice: 0, hourlyRate: 15000, minHours: 3, description: "Commercial & workspace cleaning", sortOrder: 4 },
  { name: "Garden & Outdoor", emoji: "🌿", tint: "#e7f6ec", mode: "HOURS" as const, basePrice: 0, hourlyRate: 12000, minHours: 2, description: "Outdoor tidy, sweeping & more", sortOrder: 5 },
];

const ADDONS = [
  { name: "Ironing", emoji: "👕", price: 9000 },
  { name: "Laundry", emoji: "🧺", price: 8000 },
  { name: "Inside windows", emoji: "🪟", price: 12000 },
  { name: "Inside fridge", emoji: "❄️", price: 9000 },
  { name: "Inside oven", emoji: "🔥", price: 11000 },
];

async function main() {
  console.log("Seeding…");

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Areas
  const areas: Record<string, string> = {};
  for (const name of AREAS) {
    const a = await prisma.area.upsert({ where: { name }, update: {}, create: { name } });
    areas[name] = a.id;
  }

  // Services & add-ons (idempotent by name)
  for (const s of SERVICES) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (existing) await prisma.service.update({ where: { id: existing.id }, data: s });
    else await prisma.service.create({ data: s });
  }
  for (const a of ADDONS) {
    const existing = await prisma.addon.findFirst({ where: { name: a.name } });
    if (!existing) await prisma.addon.create({ data: a });
  }

  const pw = await hash("Password123!", { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@householdmaids.co.za" },
    update: {},
    create: { email: "admin@householdmaids.co.za", fullName: "Ops Admin", role: "ADMIN", passwordHash: pw, phone: "+27 62 032 4931" },
  });

  // Customer (Thandi) with referral code
  const thandi = await prisma.user.upsert({
    where: { email: "thandi@email.co.za" },
    update: {},
    create: { email: "thandi@email.co.za", fullName: "Thandi Mokoena", role: "CUSTOMER", passwordHash: pw, phone: "+27 82 145 7733" },
  });
  await prisma.referralCode.upsert({
    where: { ownerId: thandi.id },
    update: {},
    create: { ownerId: thandi.id, code: "THANDI-50" },
  });

  // Helper (Lindiwe), approved & vetted
  const lindiwe = await prisma.user.upsert({
    where: { email: "lindiwe@email.co.za" },
    update: {},
    create: { email: "lindiwe@email.co.za", fullName: "Lindiwe Ndlovu", role: "HELPER", passwordHash: pw, phone: "+27 71 552 3380" },
  });
  await prisma.helperProfile.upsert({
    where: { userId: lindiwe.id },
    update: {},
    create: {
      userId: lindiwe.id,
      idNumberEnc: encrypt("9203150123088"),
      yearsExperience: 6,
      status: "APPROVED",
      rating: 4.9,
      completedJobs: 320,
      bankAccountEnc: encrypt(JSON.stringify({ bank: "First National Bank", accountNumber: "62534887901", type: "Cheque / Current" })),
      idUploaded: true, selfieUploaded: true, referencesAdded: true, clearanceConsent: true, backgroundCheckPassed: true,
      areas: { connect: [{ id: areas["Sandton"] }, { id: areas["Midrand"] }] },
    },
  });

  // A couple of pending helper applicants for the vetting board
  for (const applicant of [
    { email: "nomsa@email.co.za", name: "Nomsa Sithole", area: "Soweto", exp: 6, bg: true },
    { email: "grace@email.co.za", name: "Grace Maluleke", area: "Midrand", exp: 3, bg: false },
  ]) {
    const u = await prisma.user.upsert({
      where: { email: applicant.email },
      update: {},
      create: { email: applicant.email, fullName: applicant.name, role: "HELPER", passwordHash: pw },
    });
    await prisma.helperProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id, yearsExperience: applicant.exp, status: "IN_REVIEW",
        idUploaded: true, selfieUploaded: true, referencesAdded: applicant.bg,
        clearanceConsent: true, backgroundCheckPassed: applicant.bg,
        areas: { connect: [{ id: areas[applicant.area] }] },
      },
    });
  }

  console.log("Seed complete.\n  Admin:    admin@householdmaids.co.za / Password123!\n  Customer: thandi@email.co.za / Password123!\n  Helper:   lindiwe@email.co.za / Password123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
