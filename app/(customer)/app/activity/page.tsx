import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { AppShell, ScreenHeader } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "payment", label: "Payments" },
  { key: "credit", label: "Credits" },
  { key: "withdrawal", label: "Withdrawals" },
];

type Item = { id: string; kind: "payment" | "credit" | "withdrawal"; title: string; sub: string; amountCents: number; date: Date; icon: string };

function methodLabel(ref: string | null | undefined): string {
  if (ref?.startsWith("WALLET-")) return "Wallet";
  if (ref?.startsWith("EFT-")) return "EFT";
  if (ref?.startsWith("SIMULATED-")) return "Card";
  return "Card";
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { filter } = await searchParams;
  const f = FILTERS.some((x) => x.key === filter) ? filter : "";

  const [paidBookings, walletTxns] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: user.id, paymentStatus: { in: ["PAID", "REFUNDED"] } },
      orderBy: { createdAt: "desc" },
      include: { service: { select: { name: true } }, payment: { select: { providerRef: true } } },
    }),
    prisma.walletTransaction.findMany({ where: { userId: user.id, status: { not: "REVERSED" } }, orderBy: { createdAt: "desc" } }),
  ]);

  const items: Item[] = [];

  for (const b of paidBookings) {
    items.push({
      id: `b-${b.id}`, kind: "payment",
      title: b.service.name,
      sub: `${methodLabel(b.payment?.providerRef)} · ${b.reference}`,
      amountCents: -b.totalCents, date: b.createdAt, icon: "🧹",
    });
  }
  for (const t of walletTxns) {
    // Wallet debits for booking payments are already represented by the booking
    // payment row above — skip them here to avoid double-counting.
    if (t.type === "ADJUSTMENT" && t.amountCents < 0) continue;
    if (t.type === "WITHDRAWAL") {
      items.push({ id: `w-${t.id}`, kind: "withdrawal", title: "Withdrawal to bank", sub: t.status === "PENDING" ? "Processing" : "Paid", amountCents: t.amountCents, date: t.createdAt, icon: "🏦" });
    } else if (t.amountCents > 0) {
      const isRef = t.type === "REFERRAL_REWARD";
      items.push({
        id: `w-${t.id}`, kind: "credit",
        title: isRef ? "Referral reward" : t.ref?.startsWith("Refund") ? "Refund to wallet" : "Wallet credit",
        sub: t.status === "PENDING" ? "Pending" : "Available",
        amountCents: t.amountCents, date: t.createdAt, icon: isRef ? "🤝" : "↩️",
      });
    }
  }

  const filtered = (f ? items.filter((i) => i.kind === f) : items).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <AppShell>
      <ScreenHeader title="Activity" subtitle="Your payments, credits and withdrawals." back={<Link href="/app/wallet" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand" aria-label="Back to wallet">‹</Link>} />

      <div className="flex flex-wrap gap-2 px-[18px] pb-1">
        {FILTERS.map((x) => {
          const on = f === x.key;
          return (
            <Link key={x.key} href={x.key ? `/app/activity?filter=${x.key}` : "/app/activity"} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-indigo-brand text-white" : "border border-line-input bg-white text-muted"}`}>
              {x.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 px-[18px] pb-6 pt-3">
        {filtered.length === 0 && <div className="card p-6 text-center text-[13.5px] text-muted">Nothing here yet.</div>}
        {filtered.map((i) => {
          const credit = i.amountCents > 0;
          return (
            <div key={i.id} className="flex items-center gap-3 rounded-[15px] border border-line bg-white px-3.5 py-3">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-surface-lav text-[17px]">{i.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold leading-tight">{i.title}</div>
                <div className="text-[11.5px] text-muted-faint">{i.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · {i.sub}</div>
              </div>
              <div className={`font-display text-[14.5px] font-bold tabular-nums ${credit ? "text-money" : "text-ink"}`}>{credit ? "+" : "−"}{formatZar(Math.abs(i.amountCents))}</div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
