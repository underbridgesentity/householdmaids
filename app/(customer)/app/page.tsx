import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getWallet } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";
import { fromPriceCents } from "@/lib/pricing";
import { formatZar } from "@/lib/money";
import { servicePhoto } from "@/lib/service-photos";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireRole("CUSTOMER");
  const [services, wallet, settings, upcoming] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    getWallet(user.id),
    getSettings(),
    prisma.booking.findFirst({
      where: { customerId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { scheduledAt: "asc" },
      include: { service: true, helper: { include: { user: true } } },
    }),
  ]);
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <AppShell>
      {/* Header */}
      <div className="relative overflow-hidden rounded-b-[30px] bg-brand-gradient-160 px-5 pb-16 pt-4">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[.07]" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/15 font-display text-base font-bold text-white">
              {firstName[0]}
            </div>
            <div>
              <div className="text-[12.5px] text-white/70">Good day,</div>
              <div className="font-display text-[17px] font-bold text-white">{firstName} 👋</div>
            </div>
          </div>
          <Link href="/app/wallet" className="rounded-[13px] bg-white/15 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-white/70">Wallet</div>
            <div className="font-display text-[15px] font-bold text-white">{formatZar(wallet.availableCents)}</div>
          </Link>
        </div>
      </div>

      <div className="relative z-10 -mt-10 px-[18px]">
        {/* Active booking */}
        {upcoming ? (
          <Link href={upcoming.paymentStatus !== "PAID" ? `/app/pay/${upcoming.reference}` : `/app/bookings/${upcoming.reference}`} className="block card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              {upcoming.paymentStatus !== "PAID" ? (
                <span className="rounded-lg bg-[#fdf0dc] px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-orange-accent">● Payment pending</span>
              ) : (
                <span className="rounded-lg bg-[#e6f6ed] px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-money">● Upcoming clean</span>
              )}
              <span className="text-[13px] font-semibold text-magenta-brand">{upcoming.paymentStatus !== "PAID" ? "Pay now ›" : "Track ›"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[15px] bg-gradient-to-br from-[#efe5f6] to-[#f7eef9] text-2xl">{upcoming.service.emoji}</div>
              <div>
                <div className="font-display text-[15.5px] font-bold">{upcoming.service.name}</div>
                <div className="mt-0.5 text-[13px] text-muted">
                  {new Date(upcoming.scheduledAt).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                  {upcoming.helper?.user.fullName ?? "Matching cleaner…"}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/app/book" className="block card p-5 text-center shadow-card">
            <div className="text-3xl">🧹</div>
            <div className="mt-2 font-display font-bold">Book your first clean</div>
            <div className="text-[13px] text-muted">Trusted, vetted cleaners across Gauteng and Mpumalanga.</div>
          </Link>
        )}

        {/* Quick actions */}
        <div className="mt-3.5 grid grid-cols-4 gap-2.5">
          {[
            { href: "/app/book", icon: "🧽", label: "Book" },
            { href: "/app/bookings", icon: "🗓️", label: "Bookings" },
            { href: "/app/activity", icon: "📂", label: "Activity" },
            { href: "/app/messages", icon: "💬", label: "Messages" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-white py-3 shadow-card">
              <span className="text-[20px]">{a.icon}</span>
              <span className="text-[11.5px] font-bold text-ink">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Referral banner */}
        <Link href="/app/wallet" className="relative mt-3.5 flex items-center gap-3.5 overflow-hidden rounded-[20px] bg-gradient-to-r from-magenta-brand to-purple-deep p-4 text-white shadow-card">
          <div className="absolute -right-5 -top-5 text-[90px] opacity-[.14]">💸</div>
          <div className="text-3xl">🎁</div>
          <div className="relative flex-1">
            <div className="font-display text-[15.5px] font-bold">Earn {formatZar(settings.referrerRewardCents)} per friend</div>
            <div className="mt-0.5 text-[12.5px] text-white/80">Share your link, get paid when they book.</div>
          </div>
          <span className="text-xl">›</span>
        </Link>

        {/* Services */}
        <div className="mb-3 mt-6 flex items-center justify-between px-0.5">
          <h3 className="font-display text-[17px] font-bold">Book a service</h3>
          <Link href="/app/book" className="text-[13px] font-bold text-magenta-brand">See all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {services.map((s) => (
            <Link key={s.id} href={`/app/book?service=${s.id}`} className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
              <div className="relative h-24 w-full">
                <Image src={servicePhoto(s.name)} alt={s.name} fill sizes="220px" className="object-cover" />
                <div className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-[11px] text-lg shadow" style={{ background: s.tint }}>{s.emoji}</div>
              </div>
              <div className="p-3">
                <div className="font-display text-[14.5px] font-bold">{s.name}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">from {formatZar(fromPriceCents(s, settings))}</div>
              </div>
            </Link>
          ))}
        </div>
        <div className="h-6" />
      </div>
    </AppShell>
  );
}
