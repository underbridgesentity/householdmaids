import Link from "next/link";
import { Download, Banknote, CalendarRange, Receipt, UserPlus, CreditCard, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { PageHeader } from "@/components/admin/PageHeader";
import { AreaChart, StatTile } from "@/components/admin/charts";
import { buildHref } from "@/lib/admin-table";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const windowDays = sp.window === "90" ? 90 : sp.window === "7" ? 7 : 30;
  const bucketDays = windowDays >= 90 ? 7 : 1;
  const buckets = Math.ceil(windowDays / bucketDays);

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const windowStart = new Date(startOfToday.getTime() - (windowDays - 1) * 86400000);

  const [paidInWindow, newCustomers, walletBefore, walletInWindow, helperAgg, topHelpers, refStats] = await Promise.all([
    prisma.booking.findMany({
      where: { paymentStatus: { in: ["PAID", "REFUNDED"] }, status: { not: "CANCELLED" }, createdAt: { gte: windowStart } },
      select: { createdAt: true, totalCents: true, paymentStatus: true, payment: { select: { providerRef: true } } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: windowStart } } }),
    prisma.walletTransaction.aggregate({ _sum: { amountCents: true }, where: { status: { in: ["EARNED", "PAID"] }, createdAt: { lt: windowStart } } }),
    prisma.walletTransaction.findMany({ where: { status: { in: ["EARNED", "PAID"] }, createdAt: { gte: windowStart } }, select: { createdAt: true, amountCents: true } }),
    prisma.booking.groupBy({ by: ["helperId"], where: { paymentStatus: "PAID", status: { not: "CANCELLED" }, helperId: { not: null } }, _sum: { totalCents: true }, _count: true }),
    prisma.helperProfile.findMany({ where: { status: "APPROVED" }, include: { user: { select: { fullName: true } } }, orderBy: { completedJobs: "desc" }, take: 8 }),
    prisma.referral.findMany({ select: { status: true, rewardCents: true } }),
  ]);

  // Revenue is paid bookings only (exclude the refunded ones from the money totals).
  const paid = paidInWindow.filter((b) => b.paymentStatus === "PAID");
  const revenueCents = paid.reduce((t, b) => t + b.totalCents, 0);
  const walletPaid = paid.filter((b) => b.payment?.providerRef?.startsWith("WALLET-"));
  const walletRevenueCents = walletPaid.reduce((t, b) => t + b.totalCents, 0);
  const cardRevenueCents = revenueCents - walletRevenueCents;
  const avgCents = paid.length ? Math.round(revenueCents / paid.length) : 0;

  // Revenue series, bucketed.
  const revenueSeries: { label: string; value: number }[] = [];
  for (let i = 0; i < buckets; i++) {
    const from = new Date(windowStart.getTime() + i * bucketDays * 86400000);
    const to = new Date(from.getTime() + bucketDays * 86400000);
    const cents = paid.filter((b) => b.createdAt >= from && b.createdAt < to).reduce((t, b) => t + b.totalCents, 0);
    const showLabel = buckets <= 16 || i % 3 === 0;
    revenueSeries.push({ label: showLabel ? from.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "", value: Math.round(cents / 100) });
  }

  // Wallet-liability trend: start balance + cumulative deltas per bucket.
  let running = walletBefore._sum.amountCents ?? 0;
  const liabilitySeries: { label: string; value: number }[] = [];
  for (let i = 0; i < buckets; i++) {
    const from = new Date(windowStart.getTime() + i * bucketDays * 86400000);
    const to = new Date(from.getTime() + bucketDays * 86400000);
    running += walletInWindow.filter((t) => t.createdAt >= from && t.createdAt < to).reduce((s, t) => s + t.amountCents, 0);
    const showLabel = buckets <= 16 || i % 3 === 0;
    liabilitySeries.push({ label: showLabel ? from.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "", value: Math.round(running / 100) });
  }

  // Top cleaners by revenue.
  const revByHelper = new Map(helperAgg.map((h) => [h.helperId, { rev: h._sum.totalCents ?? 0, jobs: h._count }]));
  const cleaners = topHelpers
    .map((h) => ({ name: h.user.fullName, rating: h.rating, completed: h.completedJobs, rev: revByHelper.get(h.id)?.rev ?? 0 }))
    .sort((a, b) => b.rev - a.rev);

  const refEarned = refStats.filter((r) => r.status === "EARNED" || r.status === "PAID");
  const refRewardCents = refEarned.reduce((t, r) => t + r.rewardCents, 0);
  const refConversion = refStats.length ? Math.round((refEarned.length / refStats.length) * 100) : 0;

  const windows = [{ k: "7", l: "7 days" }, { k: "30", l: "30 days" }, { k: "90", l: "90 days" }];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Performance over the last ${windowDays} days`}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-[11px] border border-line-input bg-white p-1">
              {windows.map((w) => {
                const on = String(windowDays) === w.k;
                return <Link key={w.k} href={buildHref("/admin/reports", sp, { window: w.k })} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-indigo-brand text-white" : "text-muted hover:text-indigo-brand"}`}>{w.l}</Link>;
              })}
            </div>
            <Link href={buildHref("/admin/reports/export", sp, {})} className="inline-flex items-center gap-2 rounded-[11px] border border-line-input bg-white px-3.5 py-2.5 text-[13px] font-bold text-indigo-brand transition hover:bg-surface-lav"><Download size={15} /> Export</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatTile label="Revenue" value={formatZar(revenueCents)} sub={`${paid.length} paid bookings`} accent="indigo" icon={<Banknote size={16} strokeWidth={2.2} />} />
        <StatTile label="Avg booking" value={formatZar(avgCents)} sub="per paid booking" accent="magenta" icon={<Receipt size={16} strokeWidth={2.2} />} />
        <StatTile label="New customers" value={String(newCustomers)} sub="in this window" accent="orange" icon={<UserPlus size={16} strokeWidth={2.2} />} />
        <StatTile label="Bookings" value={String(paidInWindow.length)} sub="paid + refunded" accent="money" icon={<CalendarRange size={16} strokeWidth={2.2} />} />
      </div>

      <div className="mt-5 rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
        <div className="font-display text-[15px] font-bold text-ink">Revenue over time</div>
        <div className="text-[12.5px] text-muted">In rand{bucketDays > 1 ? ", weekly buckets" : ", daily"}</div>
        <div className="mt-3"><AreaChart data={revenueSeries} color="#4A2C7C" height={220} /></div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Cash vs wallet */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
          <div className="font-display text-[15px] font-bold text-ink">How customers paid</div>
          <div className="mt-4 flex flex-col gap-3">
            <SplitBar label="Card (Payfast)" icon={<CreditCard size={15} />} cents={cardRevenueCents} total={revenueCents} color="#4A2C7C" />
            <SplitBar label="Wallet credit" icon={<Wallet size={15} />} cents={walletRevenueCents} total={revenueCents} color="#1F9D63" />
          </div>
          <p className="mt-4 text-[12px] text-muted-faint">Wallet payments draw down referral & refund credit — they are revenue recognised but not fresh cash in.</p>
        </div>

        {/* Wallet liability trend */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
          <div className="font-display text-[15px] font-bold text-ink">Wallet liability</div>
          <div className="text-[12.5px] text-muted">Outstanding credit owed to customers (rand)</div>
          <div className="mt-3"><AreaChart data={liabilitySeries} color="#A22D8F" height={170} /></div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Top cleaners */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)] lg:col-span-2">
          <div className="mb-3 font-display text-[15px] font-bold text-ink">Top cleaners</div>
          {cleaners.length === 0 ? <div className="py-6 text-center text-[13px] text-muted">No active cleaners yet.</div> : (
            <div className="flex flex-col">
              {cleaners.map((c, i) => (
                <div key={c.name + i} className="flex items-center gap-3 border-b border-[#f3eff8] py-2.5 last:border-0">
                  <div className="w-5 text-center font-display text-[13px] font-bold text-muted-faint">{i + 1}</div>
                  <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold text-ink">{c.name}</div><div className="text-[11.5px] text-muted-faint">{c.completed} completed · ⭐ {c.rating.toFixed(1)}</div></div>
                  <div className="font-display text-[13.5px] font-bold tabular-nums text-indigo-brand">{formatZar(c.rev)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral performance */}
        <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
          <div className="mb-3 font-display text-[15px] font-bold text-ink">Referrals</div>
          <div className="flex flex-col gap-3">
            <Mini label="Total referrals" value={String(refStats.length)} />
            <Mini label="Converted" value={`${refEarned.length} · ${refConversion}%`} />
            <Mini label="Rewards earned" value={formatZar(refRewardCents)} accent />
          </div>
        </div>
      </div>
    </div>
  );
}

function SplitBar({ label, icon, cents, total, color }: { label: string; icon: React.ReactNode; cents: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((cents / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink" style={{ color }}>{icon} {label}</span>
        <span className="font-display font-bold tabular-nums text-ink">{formatZar(cents)} · {pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-lav"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[13px] bg-[#faf8fc] px-3.5 py-3">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <span className={`font-display text-[15px] font-extrabold tabular-nums ${accent ? "text-money" : "text-indigo-brand"}`}>{value}</span>
    </div>
  );
}
