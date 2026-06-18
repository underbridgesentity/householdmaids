import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { CalendarRange, Wallet, Banknote, Users, TriangleAlert, BadgeCheck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatTile, AreaChart } from "@/components/admin/charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day14 = new Date(startOfToday.getTime() - 13 * 24 * 60 * 60 * 1000);

  const [
    revenueAgg, bookingsThisWeek, activeHelpers, requestedPayouts, totalCustomers,
    newCustomersWeek, unassignedPaid, pendingVetting, walletLiabilityAgg,
    recent14, referralCount, rewardTxns, recentBookings,
  ] = await Promise.all([
    prisma.booking.aggregate({ _sum: { totalCents: true }, where: { paymentStatus: "PAID", status: { not: "CANCELLED" } } }),
    prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.helperProfile.count({ where: { status: "APPROVED" } }),
    prisma.payoutRequest.findMany({ where: { status: "REQUESTED" }, select: { amountCents: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: weekAgo } } }),
    prisma.booking.count({ where: { paymentStatus: "PAID", status: "CONFIRMED" } }),
    prisma.helperProfile.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["EARNED", "PAID"] } } }),
    prisma.booking.findMany({ where: { createdAt: { gte: day14 } }, select: { createdAt: true } }),
    prisma.referral.count(),
    prisma.walletTransaction.findMany({ where: { type: "REFERRAL_REWARD", status: { in: ["PAID", "EARNED"] } }, select: { amountCents: true } }),
    prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { service: true, customer: { select: { fullName: true } } } }),
  ]);

  const revenueCents = revenueAgg._sum.totalCents ?? 0;
  const payoutsDueCents = requestedPayouts.reduce((t, p) => t + p.amountCents, 0);
  const walletLiabilityCents = walletLiabilityAgg._sum.amountCents ?? 0;
  const rewardsPaidCents = rewardTxns.reduce((t, r) => t + Math.abs(r.amountCents), 0);
  const referralPct = totalCustomers > 0 ? Math.round((referralCount / totalCustomers) * 100) : 0;

  // 14-day daily booking series for the chart + sparklines.
  const series: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const value = recent14.filter((b) => b.createdAt >= d && b.createdAt < next).length;
    series.push({ label: i % 2 === 0 ? d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "", value });
  }
  const sparkBookings = series.map((s) => s.value);

  const statusLabel: Record<string, string> = {
    CONFIRMED: "Confirmed", HELPER_ASSIGNED: "Assigned", EN_ROUTE: "En route",
    IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
  };

  const alerts = [
    { label: "Paid bookings awaiting a cleaner", value: unassignedPaid, href: "/admin/bookings?status=CONFIRMED&paid=1", tone: unassignedPaid > 0 ? "warn" : "ok", icon: TriangleAlert },
    { label: "Payouts to process", value: requestedPayouts.length, href: "/admin/payouts", tone: requestedPayouts.length > 0 ? "warn" : "ok", icon: Banknote },
    { label: "Helpers pending vetting", value: pendingVetting, href: "/admin/vetting", tone: pendingVetting > 0 ? "warn" : "ok", icon: BadgeCheck },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Operations & growth at a glance" />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <StatTile label="Revenue" value={formatZar(revenueCents)} sub="paid, all-time" accent="indigo" spark={sparkBookings} sparkColor="#4A2C7C" icon={<Banknote size={16} strokeWidth={2.2} />} />
        <StatTile label="Bookings · 7d" value={String(bookingsThisWeek)} sub="new this week" accent="magenta" spark={sparkBookings} icon={<CalendarRange size={16} strokeWidth={2.2} />} />
        <StatTile label="Customers" value={totalCustomers.toLocaleString()} sub={`+${newCustomersWeek} this week`} accent="orange" icon={<Users size={16} strokeWidth={2.2} />} />
        <StatTile label="Wallet liability" value={formatZar(walletLiabilityCents)} sub="owed to customers" accent="money" icon={<Wallet size={16} strokeWidth={2.2} />} />
        <StatTile label="Payouts due" value={formatZar(payoutsDueCents)} sub={`${requestedPayouts.length} request${requestedPayouts.length === 1 ? "" : "s"}`} accent="magenta" icon={<Banknote size={16} strokeWidth={2.2} />} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-[15px] font-bold text-ink">Bookings</div>
              <div className="text-[12.5px] text-muted">Last 14 days</div>
            </div>
            <div className="rounded-full bg-surface-lav px-3 py-1 text-[12px] font-bold text-indigo-brand">{recent14.length} total</div>
          </div>
          <div className="mt-3">
            <AreaChart data={series} color="#A22D8F" height={210} />
          </div>
        </div>

        {/* Needs attention */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
          <div className="font-display text-[15px] font-bold text-ink">Needs attention</div>
          <div className="mt-3 flex flex-col gap-2.5">
            {alerts.map((a) => (
              <Link key={a.label} href={a.href} className="flex items-center gap-3 rounded-[13px] border border-line bg-[#faf8fc] px-3.5 py-3 transition hover:border-magenta-brand/40 hover:bg-surface-pink/40">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${a.tone === "warn" ? "bg-[#fdf0dc] text-orange-deep" : "bg-[#e6f6ed] text-money"}`}>
                  <a.icon size={17} strokeWidth={2.3} />
                </div>
                <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-tight text-ink">{a.label}</div>
                <div className={`font-display text-lg font-extrabold tabular-nums ${a.tone === "warn" ? "text-orange-deep" : "text-muted-faint"}`}>{a.value}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent bookings */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)] lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-[15px] font-bold text-ink">Recent bookings</div>
            <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-magenta-brand">View all <ArrowRight size={13} /></Link>
          </div>
          <div className="flex flex-col">
            {recentBookings.length === 0 && <div className="py-6 text-center text-[13px] text-muted">No bookings yet.</div>}
            {recentBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 border-b border-[#f3eff8] py-2.5 last:border-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[17px]" style={{ background: b.service.tint }}>{b.service.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{b.customer.fullName} · {b.service.name}</div>
                  <div className="text-[11.5px] text-muted-faint">{new Date(b.scheduledAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · {statusLabel[b.status]}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[13.5px] font-bold tabular-nums text-indigo-brand">{formatZar(b.totalCents)}</div>
                  <div className={`text-[10.5px] font-bold ${b.paymentStatus === "PAID" ? "text-money" : "text-orange-deep"}`}>{b.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral program */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
          <div className="font-display text-[15px] font-bold text-ink">Referral program</div>
          <div className="mt-3 flex flex-col gap-3">
            <Metric label="Signed up via referral" value={`${referralPct}%`} sub={`${referralCount} of ${totalCustomers} customers`} />
            <Metric label="Rewards earned" value={formatZar(rewardsPaidCents)} sub="referral wallet credits" />
            <Metric label="Active helpers" value={String(activeHelpers)} sub="approved & vetted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-[13px] bg-[#faf8fc] px-3.5 py-3">
      <div>
        <div className="text-[12.5px] font-semibold text-ink">{label}</div>
        <div className="text-[11.5px] text-muted-faint">{sub}</div>
      </div>
      <div className="font-display text-lg font-extrabold tabular-nums text-magenta-brand">{value}</div>
    </div>
  );
}
