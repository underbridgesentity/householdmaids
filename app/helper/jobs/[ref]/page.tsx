import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/booking";
import { advanceJobAction } from "@/app/actions/helper";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function HelperJobPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("HELPER");
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: { service: true, customer: true, area: true, helper: true },
  });
  if (!booking || booking.helper?.userId !== user.id) notFound();

  const idx = STATUS_FLOW.indexOf(booking.status);
  const isCompleted = booking.status === "COMPLETED";
  const advance = advanceJobAction.bind(null, booking.reference);

  const when = new Date(booking.scheduledAt).toLocaleString("en-ZA", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const detail = booking.service.mode === "ROOMS" ? `${booking.beds} bed · ${booking.baths} bath` : `${booking.hours} hours`;

  return (
    <AppShell variant="helper" tabs={false}>
      <div className="rounded-b-[26px] bg-brand-gradient-160 px-5 pb-6 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/helper/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg text-white">‹</Link>
          <div>
            <div className="font-display text-[19px] font-extrabold text-white">{booking.service.name}</div>
            <div className="text-[12.5px] text-white/75">Ref {booking.reference} · {STATUS_LABELS[booking.status]}</div>
          </div>
        </div>
      </div>

      <div className="px-[18px] py-4">
        {/* Job summary */}
        <div className="mb-4 card p-4">
          <div className="flex items-center gap-3 border-b border-[#f0ebf6] pb-3.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-surface-lav text-[22px]">{booking.service.emoji}</div>
            <div className="flex-1">
              <div className="font-display text-[15.5px] font-bold">{booking.customer.fullName.split(" ")[0]}</div>
              <div className="text-[12.5px] text-muted">{detail}</div>
            </div>
            <div className="font-display text-[16px] font-bold text-money">{formatZar(booking.totalCents)}</div>
          </div>
          <Row label="🗓 When" value={when} />
          <Row label="📍 Area" value={booking.area.name} />
          <Row label="🏠 Address" value={booking.addressText} />
          <Row label="💳 Payment" value={booking.paymentStatus === "PAID" ? "Paid ✓" : "Pending"} />
        </div>

        {/* Timeline */}
        <div className="card px-4 pb-2 pt-4">
          <div className="mb-3.5 font-display text-[15px] font-bold">Job status</div>
          {STATUS_FLOW.map((st, i) => {
            const done = i <= idx;
            return (
              <div key={st} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <div className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-sm text-white ${done ? "bg-money" : "bg-[#e3ddec]"}`}>✓</div>
                  {i < STATUS_FLOW.length - 1 && <div className={`my-0.5 w-0.5 flex-1 ${i < idx ? "bg-money" : "bg-[#e3ddec]"}`} style={{ minHeight: 26 }} />}
                </div>
                <div className="pb-3 pt-1">
                  <div className={`font-display text-[14.5px] ${done ? "font-bold text-ink" : "font-semibold text-muted-faint"}`}>{STATUS_LABELS[st]}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href={`/helper/jobs/${booking.reference}/chat`}
          className="mt-4 flex w-full items-center justify-center rounded-[15px] border-[1.5px] border-[#e7d7ec] bg-surface-pink py-3 text-center font-display text-[14px] font-bold text-magenta-brand"
        >
          💬 Message customer
        </Link>

        {isCompleted ? (
          <div className="mt-3 rounded-[15px] border border-[#cfe8d8] bg-[#eef6f0] py-3 text-center font-display text-[14px] font-bold text-money-dark">
            Job completed ✓
          </div>
        ) : (
          <form action={advance} className="mt-3">
            <button className="btn-primary w-full">Mark next step done ›</button>
          </form>
        )}
        <div className="h-4" />
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13.5px]">
      <span className="flex-shrink-0 text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
