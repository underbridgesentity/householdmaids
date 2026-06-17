import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/booking";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "My bookings" };

export default async function BookingsPage() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    orderBy: { scheduledAt: "desc" },
    include: { service: true },
  });

  return (
    <AppShell>
      <div className="px-5 pb-4 pt-4">
        <div className="font-display text-2xl font-extrabold">My bookings</div>
        <div className="text-[12.5px] text-muted">Track your cleans and finish any pending payments.</div>
      </div>
      <div className="flex flex-col gap-2.5 px-[18px] pb-6">
        {bookings.length === 0 && (
          <div className="card p-6 text-center text-[13.5px] text-muted">
            No bookings yet. <Link href="/app/book" className="font-semibold text-magenta-brand">Book your first clean ›</Link>
          </div>
        )}
        {bookings.map((b) => {
          const unpaid = b.paymentStatus !== "PAID" && b.status !== "CANCELLED";
          // Unpaid bookings link straight to payment so the customer can finish.
          return (
            <Link key={b.id} href={unpaid ? `/app/pay/${b.reference}` : `/app/bookings/${b.reference}`} className="flex items-center gap-3 rounded-[15px] border border-line bg-white p-3.5">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-[22px]" style={{ background: b.service.tint }}>{b.service.emoji}</div>
              <div className="flex-1">
                <div className="font-display text-[14.5px] font-bold">{b.service.name}</div>
                <div className="text-[12px] text-muted">{new Date(b.scheduledAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · {STATUS_LABELS[b.status]}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[14px] font-bold text-indigo-brand">{formatZar(b.totalCents)}</div>
                <div className={`text-[11px] font-bold ${b.paymentStatus === "PAID" ? "text-money" : b.status === "CANCELLED" ? "text-muted-faint" : "text-orange-deep"}`}>
                  {b.paymentStatus === "PAID" ? "Paid" : b.status === "CANCELLED" ? "Cancelled" : "Pay now ›"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
