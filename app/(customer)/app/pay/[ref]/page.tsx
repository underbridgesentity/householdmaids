import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { Logo } from "@/components/ui/Logo";
import { payfastConfig, payfastProcessUrl, buildCheckoutFields } from "@/lib/payfast";
import { simulatePaymentAction, cancelBookingAction } from "@/app/actions/booking";

export const dynamic = "force-dynamic";

export default async function PayPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ cancelled?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;
  const { cancelled } = await searchParams;

  const booking = await prisma.booking.findUnique({ where: { reference: ref }, include: { service: true, area: true } });
  if (!booking || booking.customerId !== user.id) notFound();

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const cfg = payfastConfig();
  const fields = buildCheckoutFields(cfg, {
    amountCents: booking.totalCents,
    // Payfast item_name must be plain ASCII: non-ASCII/special characters break
    // their signature check ("variables not according to specification").
    itemName: `Household Maids - ${booking.service.name}`,
    mPaymentId: booking.reference,
    email: user.email ?? "customer@example.com",
    name: user.name ?? "Customer",
    returnUrl: `${base}/app/bookings/${booking.reference}?paid=1`,
    cancelUrl: `${base}/app/pay/${booking.reference}?cancelled=1`,
    notifyUrl: `${base}/api/payfast/itn`,
  });
  const processUrl = payfastProcessUrl(cfg);
  const simulate = simulatePaymentAction.bind(null, booking.reference);
  const cancel = cancelBookingAction.bind(null, booking.reference);
  const isDev = process.env.NODE_ENV !== "production";
  const whenLabel = new Date(booking.scheduledAt).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const configLabel =
    booking.service.mode === "ROOMS"
      ? `${booking.beds} bed · ${booking.baths} bath`
      : booking.service.mode === "HOURS"
        ? `${booking.hours} hours`
        : "Selected extras";

  return (
    <div className="min-h-[100dvh] bg-surface lg:flex">
      {/* Order summary, gradient panel (left on desktop, header on mobile) */}
      <aside className="relative overflow-hidden bg-hero-gradient p-6 text-white lg:flex lg:w-[400px] lg:flex-col lg:p-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/[.06]" />
        <Link href="/app" className="relative z-10" aria-label="Household Maids home"><Logo variant="white" height={28} /></Link>
        <div className="relative z-10 mt-6 lg:mt-10 lg:flex-1">
          <h1 className="font-display text-2xl font-extrabold">Secure payment</h1>
          <p className="mt-1 text-[13px] text-white/80">🔒 Encrypted · powered by Payfast</p>
          <div className="mt-5 rounded-[20px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="text-[12px] font-bold uppercase tracking-wide text-white/70">Your order</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">{booking.service.emoji}</div>
              <div>
                <div className="font-display text-[15px] font-bold">{booking.service.name}</div>
                <div className="text-[12.5px] text-white/75">{booking.area.name} · {whenLabel}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
              <span className="font-display font-bold">Total</span>
              <span className="font-display text-[26px] font-extrabold">{formatZar(booking.totalCents)}</span>
            </div>
            <div className="mt-1 text-[11.5px] text-white/60">Ref {booking.reference}</div>
          </div>
        </div>
      </aside>

      {/* Payment */}
      <div className="flex flex-1 flex-col p-6 lg:items-center lg:justify-center lg:p-9">
        <div className="mx-auto w-full max-w-[440px]">
          <h2 className="mb-1 font-display text-xl font-extrabold">Review &amp; pay</h2>
          <p className="mb-4 text-[13px] text-muted">Check your booking, then continue to Payfast to pay securely.</p>

          {cancelled && (
            <div className="mb-4 rounded-[13px] border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-[13px] font-semibold text-[#d05656]">
              That payment didn&apos;t go through (it was cancelled or declined by Payfast). You can try again below.
            </div>
          )}

          {/* Booking review */}
          <div className="card p-4">
            <div className="flex items-center gap-3 border-b border-[#f0ebf6] pb-3.5">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-surface-lav text-[22px]">{booking.service.emoji}</div>
              <div className="flex-1">
                <div className="font-display text-[15.5px] font-bold">{booking.service.name}</div>
                <div className="text-[12.5px] text-muted">{configLabel}</div>
              </div>
              <div className="font-display text-[18px] font-extrabold text-indigo-brand">{formatZar(booking.totalCents)}</div>
            </div>
            <div className="flex justify-between gap-3 py-2 text-[13.5px]"><span className="text-muted">📍 Where</span><span className="text-right font-semibold">{booking.addressText}, {booking.area.name}</span></div>
            <div className="flex justify-between gap-3 py-1 text-[13.5px]"><span className="text-muted">🗓 When</span><span className="font-semibold">{whenLabel}</span></div>
            <div className="flex justify-between gap-3 py-1 text-[13.5px]"><span className="text-muted">Reference</span><span className="font-semibold">{booking.reference}</span></div>
          </div>

          <div className="mt-4 flex items-center gap-2.5 rounded-[13px] bg-[#eef6f0] px-3.5 py-3">
            <span className="text-[17px]">🔐</span>
            <span className="text-[12.5px] leading-snug text-money-dark">You&apos;ll be taken to Payfast to complete payment securely. A referral reward is earned once your payment clears.</span>
          </div>

          <form action={processUrl} method="post" className="mt-5">
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button type="submit" className="btn-primary w-full">Pay {formatZar(booking.totalCents)} with Payfast ›</button>
          </form>

          {isDev && (
            <form action={simulate} className="mt-3">
              <button className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#cfc6dd] bg-white px-4 py-3 text-[13px] font-semibold text-muted">
                ▶ Dev: simulate successful payment
              </button>
            </form>
          )}

          {/* Don't want to pay? Cancel this (unpaid) booking. */}
          <form action={cancel} className="mt-4 text-center">
            <button className="text-[12.5px] font-semibold text-muted-soft underline-offset-2 hover:text-[#d05656] hover:underline">
              Cancel this booking
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
