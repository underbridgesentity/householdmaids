import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/booking";
import { AppShell, ScreenHeader } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "My bookings" };

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "topay", label: "To pay" },
  { key: "completed", label: "Completed" },
];

const ACTIVE = ["CONFIRMED", "HELPER_ASSIGNED", "EN_ROUTE", "IN_PROGRESS"] as const;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { filter } = await searchParams;
  const f = FILTERS.some((x) => x.key === filter) ? filter : "";

  const where: Prisma.BookingWhereInput = { customerId: user.id, status: { not: "CANCELLED" } };
  if (f === "upcoming") where.status = { in: [...ACTIVE] };
  else if (f === "topay") where.paymentStatus = "PENDING";
  else if (f === "completed") where.status = "COMPLETED";

  const bookings = await prisma.booking.findMany({ where, orderBy: { scheduledAt: "desc" }, include: { service: true } });

  return (
    <AppShell>
      <ScreenHeader title="My bookings" subtitle="Track your cleans and finish any pending payments." />

      <div className="flex flex-wrap gap-2 px-[18px] pb-1">
        {FILTERS.map((x) => {
          const on = f === x.key;
          return (
            <Link key={x.key} href={x.key ? `/app/bookings?filter=${x.key}` : "/app/bookings"} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-indigo-brand text-white" : "border border-line-input bg-white text-muted"}`}>
              {x.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 px-[18px] pb-6 pt-3">
        {bookings.length === 0 && (
          <div className="card p-6 text-center text-[13.5px] text-muted">
            {f ? "Nothing here yet." : <>No bookings yet. <Link href="/app/book" className="font-semibold text-magenta-brand">Book your first clean ›</Link></>}
          </div>
        )}
        {bookings.map((b) => {
          const unpaid = b.paymentStatus !== "PAID";
          return (
            <Link key={b.id} href={unpaid ? `/app/pay/${b.reference}` : `/app/bookings/${b.reference}`} className="flex items-center gap-3 rounded-[15px] border border-line bg-white p-3.5 transition active:scale-[.99]">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-[22px]" style={{ background: b.service.tint }}>{b.service.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14.5px] font-bold">{b.service.name}</div>
                <div className="text-[12px] text-muted">{new Date(b.scheduledAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · {STATUS_LABELS[b.status]}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[14px] font-bold text-indigo-brand">{formatZar(b.totalCents)}</div>
                <div className={`text-[11px] font-bold ${b.paymentStatus === "PAID" ? "text-money" : "text-orange-deep"}`}>
                  {b.paymentStatus === "PAID" ? "Paid" : "Pay now ›"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
