import { prisma } from "@/lib/db";
import type { PlatformSettings } from "@prisma/client";

/** Reads (and lazily creates) the singleton platform settings row. */
export async function getSettings(): Promise<PlatformSettings> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.platformSettings.create({ data: { id: "singleton" } });
}
