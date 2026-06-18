import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";

export default async function AdminDashboardPage() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    bookingsThisWeek,
    revenueAgg,
    activeHelpers,
    requestedPayouts,
    recentBookings,
    totalCustomers,
    referralCount,
    referrerGroups,
    rewardTxns,
    walletLiabilityAgg,
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
    // Revenue excludes cancelled-and-refunded bookings (their value returns to the
    // wallet and is counted when the credit is later spent on a real booking).
    prisma.booking.aggregate({ _sum: { totalCents: true }, where: { paymentStatus: "PAID", status: { not: "CANCELLED" } } }),
    prisma.helperProfile.count({ where: { status: "APPROVED" } }),
    prisma.payoutRequest.findMany({ where: { status: "REQUESTED" }, select: { amountCents: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: weekAgo } }, select: { createdAt: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.referral.count(),
    prisma.referral.groupBy({ by: ["referrerId"], _count: { _all: true } }),
    prisma.walletTransaction.findMany({
      where: { type: "REFERRAL_REWARD", status: { in: ["PAID", "EARNED"] } },
      select: { amountCents: true },
    }),
    // Total outstanding wallet balance across everyone = money the platform owes.
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["EARNED", "PAID"] } } }),
  ]);

  const revenueCents = revenueAgg._sum.totalCents ?? 0;
  const walletLiabilityCents = walletLiabilityAgg._sum.amountCents ?? 0;
  const payoutsDueCents = requestedPayouts.reduce((t, p) => t + p.amountCents, 0);
  const payoutsDueCount = requestedPayouts.length;

  // Bookings per day for the last 7 days, oldest → newest.
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = recentBookings.filter((b) => b.createdAt >= d && b.createdAt < next).length;
    days.push({ label: d.toLocaleDateString("en-ZA", { weekday: "short" }), count });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  // Referral program metrics.
  const referralSignupPct = totalCustomers > 0 ? Math.round((referralCount / totalCustomers) * 100) : 0;
  const rewardsPaidCents = rewardTxns.reduce((t, r) => t + Math.abs(r.amountCents), 0);
  const avgPerReferrer = referrerGroups.length > 0 ? referralCount / referrerGroups.length : 0;

  const stats = [
    { label: "Bookings this week", value: String(bookingsThisWeek), delta: "↑ last 7 days" },
    { label: "Revenue (paid)", value: formatZar(revenueCents), delta: "↑ all time" },
    { label: "Active helpers", value: String(activeHelpers), delta: "approved & vetted" },
    { label: "Payouts due", value: formatZar(payoutsDueCents), delta: `${payoutsDueCount} request${payoutsDueCount === 1 ? "" : "s"}` },
    { label: "Wallet liability", value: formatZar(walletLiabilityCents), delta: "owed to customers" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
        <p className="mt-1 text-[14px] text-muted">Platform health at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[12px] font-semibold uppercase tracking-[.05em] text-muted-label">{s.label}</div>
            <div className="mt-2 font-display text-2xl font-extrabold text-ink">{s.value}</div>
            <div className="mt-1 text-[12px] font-semibold text-money">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookings chart */}
        <div className="card p-5">
          <div className="text-[14px] font-extrabold text-ink">Bookings · last 7 days</div>
          <div className="mt-5 flex h-44 items-end gap-3">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-brand to-magenta-brand"
                    style={{ height: `${Math.max(6, (d.count / maxCount) * 100)}%` }}
                    title={`${d.count} bookings`}
                  />
                </div>
                <div className="text-[11px] font-semibold text-muted">{d.label}</div>
                <div className="text-[11px] font-bold text-ink">{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral program */}
        <div className="card p-5">
          <div className="text-[14px] font-extrabold text-ink">Referral program</div>
          <dl className="mt-4 flex flex-col gap-4">
            <ReferralRow label="Signed up via referral" value={`${referralSignupPct}%`} hint={`${referralCount} of ${totalCustomers} customers`} />
            <ReferralRow label="Total rewards paid" value={formatZar(rewardsPaidCents)} hint="REFERRAL_REWARD ledger" />
            <ReferralRow label="Avg referrals / referrer" value={avgPerReferrer.toFixed(1)} hint={`${referrerGroups.length} active referrers`} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function ReferralRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{label}</div>
        <div className="text-[12px] text-muted">{hint}</div>
      </div>
      <div className="font-display text-xl font-extrabold text-indigo-brand">{value}</div>
    </div>
  );
}
