import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { AppShell } from "@/components/app/AppShell";
import { BookingWizard } from "@/components/app/BookingWizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book a clean" };

/**
 * Logged-in booking. Renders the wizard INSIDE the app shell (sidebar stays
 * visible on desktop) so customers are never trapped in a full-screen flow.
 * Guests use the standalone /book route instead.
 */
export default async function AppBookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const user = await requireRole("CUSTOMER");

  const [services, addons, areas, settings] = await Promise.all([
    prisma.service.findMany({ where: { active: true, quoteOnly: false }, orderBy: { sortOrder: "asc" } }),
    prisma.addon.findMany({ where: { active: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  // Quote-only services go to the enquiry flow, not the wizard.
  if (service && !services.some((s) => s.id === service)) {
    const quoteOnly = await prisma.service.findFirst({ where: { id: service, quoteOnly: true }, select: { id: true } });
    if (quoteOnly) redirect(`/quote?service=${service}`);
  }
  const initialServiceId = service && services.some((s) => s.id === service) ? service : undefined;

  const [priorBookings, referral] = await Promise.all([
    prisma.booking.count({ where: { customerId: user.id } }),
    prisma.referral.findUnique({ where: { refereeId: user.id }, include: { code: true } }),
  ]);
  const referralEligible = priorBookings === 0 && !!referral && referral.status === "PENDING";
  const referralCode = referral?.code.code;

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
    <AppShell tabs={false}>
      <BookingWizard
        embedded
        loggedIn
        services={services.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, tint: s.tint, description: s.description, mode: s.mode, basePrice: s.basePrice, hourlyRate: s.hourlyRate, minHours: s.minHours }))}
        addons={addons.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, price: a.price }))}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        settings={{
          perBedroomCents: settings.perBedroomCents,
          perBathroomCents: settings.perBathroomCents,
          weeklyDiscountPct: settings.weeklyDiscountPct,
          biweeklyDiscountPct: settings.biweeklyDiscountPct,
          firstBookingDiscountCents: settings.firstBookingDiscountCents,
          extrasMinimumCents: settings.extrasMinimumCents,
        }}
        dateOptions={dateOptions}
        referralEligible={referralEligible}
        referralCode={referralCode}
        initialServiceId={initialServiceId}
      />
    </AppShell>
  );
}
