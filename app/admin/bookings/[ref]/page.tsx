import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, CalendarClock, User, Repeat } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/booking";
import { StatusBadge, PayBadge } from "@/components/admin/badges";
import { adminAssignHelperAction, adminAdvanceBookingAction, adminCancelRefundAction, markBookingPaidAction } from "@/app/actions/admin-bookings";

export const dynamic = "force-dynamic";

type Breakdown = { baseCents: number; addonsCents: number; subtotalCents: number; recurringDiscountCents: number; referralDiscountCents: number; totalCents: number };

const RECUR: Record<string, string> = { ONCE: "One-time", WEEKLY: "Weekly", BIWEEKLY: "Every 2 weeks" };
const MSG: Record<string, { ok: boolean; text: string }> = {
  assigned: { ok: true, text: "Cleaner assigned and the customer was notified." },
  advanced: { ok: true, text: "Booking moved to its next status." },
  cancelled: { ok: true, text: "Booking cancelled. Any paid amount was refunded to the customer's wallet." },
  markedpaid: { ok: true, text: "Booking marked as paid. The customer was confirmed and a cleaner is being assigned." },
  badhelper: { ok: false, text: "That cleaner isn't approved." },
  closed: { ok: false, text: "This booking is already completed or cancelled." },
  unpaid: { ok: false, text: "Only a paid booking can be advanced." },
  completed: { ok: false, text: "A completed booking can't be cancelled." },
  already: { ok: false, text: "This booking is already cancelled." },
  alreadypaid: { ok: false, text: "This booking is already paid." },
  badproof: { ok: false, text: "Proof must be an image or PDF no larger than 8MB." },
};

export default async function AdminBookingDetailPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { ref } = await params;
  const { msg } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: {
      service: true, area: true,
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      helper: { include: { user: { select: { fullName: true } } } },
      addons: { include: { addon: { select: { name: true } } } },
      payment: true, review: true,
    },
  });
  if (!booking) notFound();

  // Vetted cleaners available to assign — those serving this area first.
  const helpers = await prisma.helperProfile.findMany({
    where: { status: "APPROVED" },
    include: { user: { select: { fullName: true } }, areas: { select: { id: true } } },
    orderBy: { rating: "desc" },
  });
  const serving = helpers.filter((h) => h.areas.some((a) => a.id === booking.areaId));
  const others = helpers.filter((h) => !h.areas.some((a) => a.id === booking.areaId));

  const bd = booking.priceSnapshot as unknown as Breakdown;
  const banner = msg ? MSG[msg] : null;
  const closed = booking.status === "CANCELLED" || booking.status === "COMPLETED";

  return (
    <div>
      <Link href="/admin/bookings" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All bookings</Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">{booking.service.name}</h1>
            <StatusBadge status={booking.status} />
            <PayBadge status={booking.paymentStatus} />
          </div>
          <div className="mt-1 font-mono text-[12.5px] font-semibold text-muted">{booking.reference}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[26px] font-extrabold tabular-nums text-indigo-brand">{formatZar(booking.totalCents)}</div>
          <div className="text-[12px] text-muted-faint">{RECUR[booking.recurrence]}</div>
        </div>
      </div>

      {banner && <div className={`mt-4 rounded-[12px] border px-4 py-3 text-[13.5px] font-semibold ${banner.ok ? "border-[#cfe8d8] bg-[#eef6f0] text-money" : "border-[#f3d9c4] bg-[#fdf3e7] text-orange-deep"}`}>{banner.text}</div>}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: details */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="Booking">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info icon={<CalendarClock size={15} />} label="Scheduled" value={booking.scheduledAt.toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
              <Info icon={<Repeat size={15} />} label="Recurrence" value={RECUR[booking.recurrence]} />
              <Info icon={<MapPin size={15} />} label="Where" value={`${booking.addressText}, ${booking.area.name}`} />
              <Info icon={<User size={15} />} label="Cleaner" value={booking.helper?.user.fullName ?? "Not assigned"} />
              {booking.service.mode === "ROOMS" && <Info label="Rooms" value={`${booking.beds} bed · ${booking.baths} bath`} />}
              {booking.service.mode === "HOURS" && <Info label="Hours" value={`${booking.hours} hours`} />}
            </div>
          </Card>

          <Card title="Price breakdown">
            <div className="flex flex-col gap-2 text-[13.5px]">
              <Line label={booking.service.mode === "EXTRAS" ? "Call-out base" : "Base"} value={formatZar(bd.baseCents)} />
              {booking.addons.length > 0 && <Line label={`Add-ons (${booking.addons.map((a) => a.addon.name).join(", ")})`} value={formatZar(bd.addonsCents)} />}
              <Line label="Subtotal" value={formatZar(bd.subtotalCents)} />
              {bd.recurringDiscountCents > 0 && <Line label="Recurring discount" value={`−${formatZar(bd.recurringDiscountCents)}`} green />}
              {bd.referralDiscountCents > 0 && <Line label="First-booking discount" value={`−${formatZar(bd.referralDiscountCents)}`} green />}
              <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5">
                <span className="font-display font-bold text-ink">Total</span>
                <span className="font-display text-[16px] font-extrabold tabular-nums text-indigo-brand">{formatZar(bd.totalCents)}</span>
              </div>
            </div>
          </Card>

          <Card title="Customer">
            <Link href={`/admin/customers/${booking.customer.id}`} className="flex items-center gap-3 rounded-[12px] p-1 transition hover:bg-surface-lav">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-brand to-magenta-brand font-display text-[13px] font-bold text-white">{booking.customer.fullName[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{booking.customer.fullName}</div>
                <div className="truncate text-[12.5px] text-muted">{booking.customer.email}{booking.customer.phone ? ` · ${booking.customer.phone}` : ""}</div>
              </div>
            </Link>
          </Card>
        </div>

        {/* Right: ops */}
        <div className="flex flex-col gap-5">
          <Card title="Assign a cleaner">
            {closed ? (
              <p className="text-[13px] text-muted">This booking is {STATUS_LABELS[booking.status].toLowerCase()} — no changes.</p>
            ) : (
              <form action={adminAssignHelperAction} className="flex flex-col gap-2.5">
                <input type="hidden" name="reference" value={booking.reference} />
                <select name="helperId" required defaultValue={booking.helperId ?? ""} className="h-10 rounded-[11px] border border-line-input bg-white px-3 text-[13.5px] outline-none focus:border-magenta-brand">
                  <option value="" disabled>Choose a cleaner…</option>
                  {serving.length > 0 && (
                    <optgroup label={`Serving ${booking.area.name}`}>
                      {serving.map((h) => <option key={h.id} value={h.id}>{h.user.fullName} · ⭐ {h.rating.toFixed(1)}</option>)}
                    </optgroup>
                  )}
                  {others.length > 0 && (
                    <optgroup label="Other areas">
                      {others.map((h) => <option key={h.id} value={h.id}>{h.user.fullName} · ⭐ {h.rating.toFixed(1)}</option>)}
                    </optgroup>
                  )}
                </select>
                <button type="submit" className="rounded-[11px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white">{booking.helperId ? "Reassign cleaner" : "Assign cleaner"}</button>
                {serving.length === 0 && <p className="text-[11.5px] text-orange-deep">No approved cleaner serves {booking.area.name} yet.</p>}
              </form>
            )}
          </Card>

          {!closed && booking.paymentStatus !== "PAID" && (
            <Card title="Record an EFT payment">
              <p className="mb-3 text-[12.5px] text-muted">Paid by bank transfer? Mark it paid here — this confirms the customer and assigns a cleaner. Attach the proof of payment if you have it.</p>
              <form action={markBookingPaidAction} className="flex flex-col gap-2.5">
                <input type="hidden" name="reference" value={booking.reference} />
                <input type="file" name="proof" accept="image/*,application/pdf" className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-lav file:px-3 file:py-2 file:text-[12.5px] file:font-bold file:text-indigo-brand" />
                <button type="submit" className="rounded-[11px] bg-money px-4 py-2.5 text-[13.5px] font-bold text-white">Mark as paid ({formatZar(booking.totalCents)})</button>
              </form>
            </Card>
          )}

          <Card title="Lifecycle">
            <div className="flex flex-col gap-2.5">
              {!closed && booking.paymentStatus === "PAID" && booking.status !== "COMPLETED" && (
                <form action={adminAdvanceBookingAction.bind(null, booking.reference)}>
                  <button type="submit" className="w-full rounded-[11px] border border-line-input bg-white px-4 py-2.5 text-[13.5px] font-bold text-indigo-brand transition hover:bg-surface-lav">Advance status →</button>
                </form>
              )}
              {!closed && (
                <form action={adminCancelRefundAction.bind(null, booking.reference)}>
                  <button type="submit" className="w-full rounded-[11px] border border-[#f1c9c9] bg-white px-4 py-2.5 text-[13.5px] font-bold text-red-500 transition hover:bg-[#fdf2f2]">
                    {booking.paymentStatus === "PAID" ? "Cancel & refund to wallet" : "Cancel booking"}
                  </button>
                </form>
              )}
              {closed && <p className="text-[13px] text-muted">No actions available.</p>}
            </div>
          </Card>

          <Card title="Payment">
            <div className="flex flex-col gap-2 text-[13px]">
              <Line label="Status" value={booking.paymentStatus} />
              <Line label="Method" value={booking.payment?.provider === "eft" ? "EFT (manual)" : booking.payment?.provider === "wallet" ? "Wallet" : booking.payment?.provider ?? "—"} />
              {booking.payment?.providerRef && <Line label="Reference" value={booking.payment.providerRef} mono />}
              {booking.payment?.proofKey && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Proof of payment</span>
                  <a href={`/api/booking-proof/${booking.reference}`} target="_blank" rel="noreferrer" className="font-semibold text-magenta-brand">View →</a>
                </div>
              )}
              {booking.review && <Line label="Rating" value={`⭐ ${booking.review.stars}/5`} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
      <div className="mb-3 font-display text-[15px] font-bold text-ink">{title}</div>
      {children}
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-label">{icon}{label}</div>
      <div className="mt-0.5 text-[13.5px] font-medium text-ink">{value}</div>
    </div>
  );
}

function Line({ label, value, green, mono }: { label: string; value: string; green?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${green ? "text-money" : "text-ink"} ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
    </div>
  );
}
