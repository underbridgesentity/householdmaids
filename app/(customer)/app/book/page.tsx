import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { AppShell } from "@/components/app/AppShell";
import { BookingWizard } from "@/components/app/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { service } = await searchParams;

  const [services, addons, areas, settings, priorBookings, referral] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.addon.findMany({ where: { active: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
    prisma.booking.count({ where: { customerId: user.id } }),
    prisma.referral.findUnique({ where: { refereeId: user.id }, include: { code: true } }),
  ]);

  // Referral discount is only offered on a genuine first booking with a pending referral.
  const referralEligible = priorBookings === 0 && !!referral && referral.status === "PENDING";

  // Build the next 5 selectable days on the server (avoids client hydration drift).
  const dateOptions = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" }),
      sub: d.toLocaleDateString("en-ZA", { month: "short" }),
    };
  });

  return (
    <AppShell tabs={false} narrow>
      <BookingWizard
        services={services.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, tint: s.tint, description: s.description, mode: s.mode, basePrice: s.basePrice, hourlyRate: s.hourlyRate, minHours: s.minHours }))}
        addons={addons.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, price: a.price }))}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        settings={{
          perBedroomCents: settings.perBedroomCents,
          perBathroomCents: settings.perBathroomCents,
          weeklyDiscountPct: settings.weeklyDiscountPct,
          biweeklyDiscountPct: settings.biweeklyDiscountPct,
          firstBookingDiscountCents: settings.firstBookingDiscountCents,
        }}
        dateOptions={dateOptions}
        referralEligible={referralEligible}
        referralCode={referral?.code.code}
        initialServiceId={service}
      />
    </AppShell>
  );
}
