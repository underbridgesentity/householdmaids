import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/ui/Logo";
import { BookingWizard } from "@/components/app/BookingWizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book a clean · Household Maids" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; ref?: string }> }) {
  const { service, ref } = await searchParams;
  const user = await getSessionUser();
  const loggedIn = user?.role === "CUSTOMER";

  const [services, addons, areas, settings] = await Promise.all([
    // Quote-only services (e.g. commercial window cleaning) are handled by the
    // /quote enquiry flow, not the instant-checkout wizard.
    prisma.service.findMany({ where: { active: true, quoteOnly: false }, orderBy: { sortOrder: "asc" } }),
    prisma.addon.findMany({ where: { active: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  // A link to a quote-only service belongs in the enquiry flow, not the wizard.
  if (service && !services.some((s) => s.id === service)) {
    const quoteOnly = await prisma.service.findFirst({ where: { id: service, quoteOnly: true }, select: { id: true } });
    if (quoteOnly) redirect(`/quote?service=${service}`);
  }
  // Only seed the wizard with a service it actually offers.
  const initialServiceId = service && services.some((s) => s.id === service) ? service : undefined;

  let referralEligible = false;
  let referralCode: string | undefined;
  if (loggedIn && user) {
    const [priorBookings, referral] = await Promise.all([
      prisma.booking.count({ where: { customerId: user.id } }),
      prisma.referral.findUnique({ where: { refereeId: user.id }, include: { code: true } }),
    ]);
    referralEligible = priorBookings === 0 && !!referral && referral.status === "PENDING";
    referralCode = referral?.code.code;
  }

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
    <div className="min-h-[100dvh] bg-surface">
      {/* Slim header on mobile only (desktop branding lives in the wizard's side panel) */}
      <div className="flex items-center justify-between border-b border-line bg-white/70 px-5 py-3 backdrop-blur lg:hidden">
        <Link href={loggedIn ? "/app" : "/"} aria-label="Household Maids home"><Logo height={28} /></Link>
        {!loggedIn && <Link href="/login" className="text-[13px] font-bold text-magenta-brand">Sign in</Link>}
      </div>
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
          extrasMinimumCents: settings.extrasMinimumCents,
        }}
        dateOptions={dateOptions}
        referralEligible={referralEligible}
        referralCode={referralCode}
        initialServiceId={initialServiceId}
        loggedIn={loggedIn}
        presetRef={ref}
      />
    </div>
  );
}
