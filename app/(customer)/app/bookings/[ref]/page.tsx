import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/booking";
import { advanceStatusAction } from "@/app/actions/booking";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  params, searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;
  const { paid } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: { service: true, helper: { include: { user: true } }, review: true },
  });
  if (!booking || booking.customerId !== user.id) notFound();

  const idx = STATUS_FLOW.indexOf(booking.status);
  const isCompleted = booking.status === "COMPLETED";
  const advance = advanceStatusAction.bind(null, booking.reference);

  return (
    <AppShell>
      <div className="rounded-b-[26px] bg-brand-gradient-160 px-5 pb-6 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/app" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg text-white">‹</Link>
          <div>
            <div className="font-display text-[19px] font-extrabold text-white">Your booking</div>
            <div className="text-[12.5px] text-white/75">Ref {booking.reference} · {STATUS_LABELS[booking.status]}</div>
          </div>
        </div>
      </div>

      <div className="px-[18px] py-4">
        {paid && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#cfe8d8] bg-[#eef6f0] p-4">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-display font-bold text-money-dark">Payment received</div>
              <div className="text-[12.5px] text-money-dark/80">Paid {formatZar(booking.totalCents)} · we&apos;re matching you with a vetted cleaner.</div>
            </div>
          </div>
        )}

        {/* Helper card */}
        {booking.helper ? (
          <div className="mb-4 card p-3.5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-[#cdbce4] to-[#e6d4ef] font-display text-[19px] font-bold text-indigo-brand">
                {booking.helper.user.fullName[0]}
              </div>
              <div className="flex-1">
                <div className="font-display text-[15.5px] font-bold">{booking.helper.user.fullName}</div>
                <div className="text-[12.5px] text-muted">⭐ {booking.helper.rating.toFixed(1)} · {booking.helper.completedJobs} cleans · ✅ Vetted</div>
              </div>
            </div>
            <div className="mt-3.5 flex gap-2.5">
              <Link href={`/app/messages/${booking.reference}`} className="flex-1 rounded-[13px] border-[1.5px] border-[#e7d7ec] bg-surface-pink py-2.5 text-center font-display text-[13.5px] font-bold text-magenta-brand">💬 Message</Link>
              <a href="tel:+27620324931" className="flex-1 rounded-[13px] border-[1.5px] border-[#e0d8ea] bg-white py-2.5 text-center font-display text-[13.5px] font-bold text-indigo-brand">📞 Call</a>
            </div>
          </div>
        ) : (
          <div className="mb-4 card p-4 text-center text-[13.5px] text-muted">Matching you with a vetted cleaner near you…</div>
        )}

        {/* Timeline */}
        <div className="card px-4 pb-2 pt-4">
          <div className="mb-3.5 font-display text-[15px] font-bold">Live status</div>
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

        {isCompleted ? (
          booking.review ? (
            <div className="mt-4 card p-4 text-center">
              <div className="text-[#E8A33D]">{"★".repeat(booking.review.stars)}{"☆".repeat(5 - booking.review.stars)}</div>
              <div className="mt-1 text-[13px] text-muted">Thanks for rating your clean.</div>
            </div>
          ) : (
            <Link href={`/app/rate/${booking.reference}`} className="btn-primary mt-4 w-full">Rate your clean ⭐</Link>
          )
        ) : (
          <form action={advance} className="mt-4">
            <button className="w-full rounded-[15px] border-[1.5px] border-dashed border-[#cfc6dd] bg-white py-3 text-[13px] font-semibold text-muted">▶ Demo: advance status</button>
          </form>
        )}
        <div className="h-4" />
      </div>
    </AppShell>
  );
}
