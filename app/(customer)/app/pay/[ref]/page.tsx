import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { Logo } from "@/components/ui/Logo";
import { payfastConfig, payfastProcessUrl, buildCheckoutFields } from "@/lib/payfast";
import { simulatePaymentAction } from "@/app/actions/booking";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({ where: { reference: ref }, include: { service: true, area: true } });
  if (!booking || booking.customerId !== user.id) notFound();

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const cfg = payfastConfig();
  const fields = buildCheckoutFields(cfg, {
    amountCents: booking.totalCents,
    itemName: `Household Maids · ${booking.service.name}`,
    mPaymentId: booking.reference,
    email: user.email ?? "customer@example.com",
    name: user.name ?? "Customer",
    returnUrl: `${base}/app/bookings/${booking.reference}?paid=1`,
    cancelUrl: `${base}/app/pay/${booking.reference}?cancelled=1`,
    notifyUrl: `${base}/api/payfast/itn`,
  });
  const processUrl = payfastProcessUrl(cfg);
  const simulate = simulatePaymentAction.bind(null, booking.reference);
  const isDev = process.env.NODE_ENV !== "production";
  const whenLabel = new Date(booking.scheduledAt).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-[100dvh] bg-surface lg:flex">
      {/* Order summary — gradient panel (left on desktop, header on mobile) */}
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
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-card">
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="mb-7 flex items-center justify-between"><span className="text-[13px] opacity-85">Household Maids</span><span className="text-[22px]">💳</span></div>
            <div className="mb-4 font-display text-[19px] tracking-[.12em]">•••• •••• •••• 4471</div>
            <div className="flex justify-between text-xs opacity-85"><span>{(user.name ?? "CUSTOMER").toUpperCase()}</span><span>09/27</span></div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[13px] bg-[#eef6f0] px-3.5 py-3">
            <span className="text-[17px]">🔐</span>
            <span className="text-[12.5px] leading-snug text-money-dark">You&apos;ll be taken to Payfast to complete payment securely. A referral reward is earned once your payment clears.</span>
          </div>

          <form action={processUrl} method="post" className="mt-5">
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button type="submit" className="btn-primary w-full">Pay {formatZar(booking.totalCents)} ›</button>
          </form>

          {isDev && (
            <form action={simulate} className="mt-3">
              <button className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#cfc6dd] bg-white px-4 py-3 text-[13px] font-semibold text-muted">
                ▶ Dev: simulate successful payment
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
