import Link from "next/link";
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
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.addon.findMany({ where: { active: true } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

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
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_80%_-10%,#efe7f6_0%,#ded9e6_55%,#d4cee0_100%)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[680px] flex-col bg-surface shadow-[0_0_90px_-28px_rgba(40,25,80,.4)]">
        {/* Slim brand header */}
        <div className="flex items-center justify-between border-b border-line bg-white/70 px-5 py-3 backdrop-blur">
          <Link href={loggedIn ? "/app" : "/"} aria-label="Household Maids home"><Logo height={30} /></Link>
          {!loggedIn && (
            <Link href="/login" className="text-[13px] font-bold text-magenta-brand">Sign in</Link>
          )}
        </div>
        <div className="flex flex-1 flex-col">
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
            referralCode={referralCode}
            initialServiceId={service}
            loggedIn={loggedIn}
            presetRef={ref}
          />
        </div>
      </div>
    </div>
  );
}
