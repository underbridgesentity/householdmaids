import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";
import { payfastConfig, payfastProcessUrl, buildCheckoutFields } from "@/lib/payfast";
import { simulatePaymentAction } from "@/app/actions/booking";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({ where: { reference: ref }, include: { service: true } });
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

  return (
    <AppShell tabs={false} narrow>
      <div className="flex min-h-screen flex-col md:min-h-0 md:h-full">
        <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
          <Link href="/app/book" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</Link>
          <div>
            <div className="font-display text-xl font-extrabold">Secure payment</div>
            <div className="text-[12.5px] text-muted">🔒 Encrypted · powered by Payfast</div>
          </div>
        </div>

        <div className="flex-1 px-[18px]">
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-card">
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="mb-7 flex items-center justify-between"><span className="text-[13px] opacity-85">Household Maids</span><span className="text-[22px]">💳</span></div>
            <div className="mb-4 font-display text-[19px] tracking-[.12em]">•••• •••• •••• 4471</div>
            <div className="flex justify-between text-xs opacity-85"><span>{(user.name ?? "CUSTOMER").toUpperCase()}</span><span>09/27</span></div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[13px] bg-[#eef6f0] px-3.5 py-3">
            <span className="text-[17px]">🔐</span>
            <span className="text-[12.5px] leading-snug text-money-dark">Paying here is how we verify a referral. Your friend earns once this payment clears.</span>
          </div>

          {isDev && (
            <form action={simulate} className="mt-4">
              <button className="w-full rounded-[14px] border-[1.5px] border-dashed border-[#cfc6dd] bg-white px-4 py-3 text-[13px] font-semibold text-muted">
                ▶ Dev: simulate successful payment
              </button>
            </form>
          )}
        </div>

        <div className="mt-auto flex items-center gap-3.5 border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
          <div className="flex-1">
            <div className="text-[10.5px] uppercase tracking-wide text-muted-faint">Total</div>
            <div className="font-display text-[21px] font-extrabold">{formatZar(booking.totalCents)}</div>
          </div>
          <form action={processUrl} method="post">
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <button type="submit" className="rounded-[15px] bg-brand-gradient px-6 py-3.5 font-display font-bold text-white">
              Pay {formatZar(booking.totalCents)}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
