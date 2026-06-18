import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Wallet, CalendarRange, Gift, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { getWallet } from "@/lib/wallet";
import { emailCustomerAction } from "@/app/actions/admin-comms";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  CONFIRMED: "Confirmed", HELPER_ASSIGNED: "Assigned", EN_ROUTE: "En route",
  IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
const PAY: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Paid", cls: "text-money" },
  PENDING: { label: "Unpaid", cls: "text-orange-deep" },
  FAILED: { label: "Failed", cls: "text-red-500" },
  REFUNDED: { label: "Refunded", cls: "text-muted" },
};

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { id } = await params;
  const { msg } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: { createdAt: "desc" }, include: { service: { select: { name: true, emoji: true, tint: true } }, area: { select: { name: true } } } },
      walletTxns: { orderBy: { createdAt: "desc" }, take: 12 },
      referralCode: true,
      referralsMade: { include: { referee: { select: { fullName: true, createdAt: true } } }, orderBy: { createdAt: "desc" } },
      referredBy: { include: { referrer: { select: { id: true, fullName: true } } } },
      communications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user || user.role !== "CUSTOMER") notFound();

  const wallet = await getWallet(user.id);
  const paidCents = user.bookings.filter((b) => b.paymentStatus === "PAID" && b.status !== "CANCELLED").reduce((t, b) => t + b.totalCents, 0);
  const earnedRefs = user.referralsMade.filter((r) => r.status === "EARNED" || r.status === "PAID");

  const banner = msg === "sent" ? { ok: true, text: "Email sent and saved to the customer's notifications." }
    : msg === "emailfailed" ? { ok: false, text: "Email could not be sent. Check the email provider configuration." }
    : msg === "invalid" ? { ok: false, text: "Add a subject and a message before sending." }
    : null;

  return (
    <div>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All customers</Link>

      {/* Identity header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-brand to-magenta-brand font-display text-xl font-bold text-white">{user.fullName[0]?.toUpperCase() ?? "?"}</div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">{user.fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><Mail size={13} /> {user.email}</span>
            {user.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {user.phone}</span>}
            <span>Joined {user.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {banner && (
        <div className={`mt-4 rounded-[12px] border px-4 py-3 text-[13.5px] font-semibold ${banner.ok ? "border-[#cfe8d8] bg-[#eef6f0] text-money" : "border-[#f3d9c4] bg-[#fdf3e7] text-orange-deep"}`}>{banner.text}</div>
      )}

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi icon={<TrendingUp size={16} strokeWidth={2.2} />} label="Lifetime value" value={formatZar(paidCents)} c="#4A2C7C" />
        <Kpi icon={<CalendarRange size={16} strokeWidth={2.2} />} label="Bookings" value={String(user.bookings.length)} c="#A22D8F" />
        <Kpi icon={<Wallet size={16} strokeWidth={2.2} />} label="Wallet balance" value={formatZar(wallet.availableCents)} c="#1F9D63" />
        <Kpi icon={<Gift size={16} strokeWidth={2.2} />} label="Referrals earned" value={String(earnedRefs.length)} c="#F2960E" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: bookings + wallet ledger */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title={`Bookings (${user.bookings.length})`}>
            {user.bookings.length === 0 ? <Empty>No bookings yet.</Empty> : (
              <div className="flex flex-col">
                {user.bookings.slice(0, 12).map((b) => {
                  const pay = PAY[b.paymentStatus] ?? PAY.PENDING;
                  return (
                    <Link key={b.id} href={`/admin/bookings/${b.reference}`} className="group flex items-center gap-3 border-b border-[#f3eff8] py-2.5 last:border-0 transition hover:bg-[#fbf9fd]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[16px]" style={{ background: b.service.tint }}>{b.service.emoji}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold text-ink">{b.service.name} · {b.area.name}</div>
                        <div className="text-[11.5px] text-muted-faint">{new Date(b.scheduledAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · {STATUS[b.status]} · {b.reference}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[13.5px] font-bold tabular-nums text-indigo-brand">{formatZar(b.totalCents)}</div>
                        <div className={`text-[10.5px] font-bold ${pay.cls}`}>{pay.label}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Wallet activity">
            {user.walletTxns.length === 0 ? <Empty>No wallet activity.</Empty> : (
              <div className="flex flex-col">
                {user.walletTxns.map((t) => {
                  const credit = t.amountCents >= 0;
                  const label = t.type === "REFERRAL_REWARD" ? "Referral reward" : t.type === "WITHDRAWAL" ? "Withdrawal" : credit ? "Credit" : "Payment";
                  return (
                    <div key={t.id} className="flex items-center justify-between border-b border-[#f3eff8] py-2.5 last:border-0">
                      <div>
                        <div className="text-[13px] font-semibold text-ink">{label}</div>
                        <div className="text-[11.5px] text-muted-faint">{t.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} · {t.status.toLowerCase()}</div>
                      </div>
                      <div className={`font-display text-[13.5px] font-bold tabular-nums ${credit ? "text-money" : "text-ink"}`}>{credit ? "+" : "−"}{formatZar(Math.abs(t.amountCents))}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: referral info + email composer */}
        <div className="flex flex-col gap-5">
          <Card title="Referrals">
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Referral code</span>
                <span className="font-display font-bold text-indigo-brand">{user.referralCode?.code ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Referred by</span>
                {user.referredBy ? (
                  <Link href={`/admin/customers/${user.referredBy.referrer.id}`} className="font-semibold text-magenta-brand">{user.referredBy.referrer.fullName}</Link>
                ) : <span className="text-muted-faint">—</span>}
              </div>
              <div className="border-t border-line pt-3">
                <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-muted-label">Referred {user.referralsMade.length}</div>
                {user.referralsMade.length === 0 ? <div className="text-[12.5px] text-muted-faint">No referrals yet.</div> : (
                  <div className="flex flex-col gap-1.5">
                    {user.referralsMade.slice(0, 6).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-[12.5px]">
                        <span className="truncate text-ink">{r.referee.fullName}</span>
                        <span className={`font-bold ${r.status === "PENDING" ? "text-muted-faint" : "text-money"}`}>{r.status === "PENDING" ? "pending" : formatZar(r.rewardCents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card title="Send an email">
            <form action={emailCustomerAction} className="flex flex-col gap-2.5">
              <input type="hidden" name="customerId" value={user.id} />
              <input name="subject" required maxLength={140} placeholder="Subject" className="h-10 rounded-[11px] border border-line-input bg-white px-3 text-[13.5px] outline-none transition focus:border-magenta-brand focus:ring-2 focus:ring-magenta-brand/15" />
              <textarea name="body" required maxLength={4000} rows={4} placeholder={`Write to ${user.fullName.split(" ")[0]}…`} className="rounded-[11px] border border-line-input bg-white px-3 py-2.5 text-[13.5px] outline-none transition focus:border-magenta-brand focus:ring-2 focus:ring-magenta-brand/15" />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white"><Mail size={15} /> Send email</button>
              <p className="text-[11px] text-muted-faint">Also saved to the customer&apos;s in-app notifications.</p>
            </form>
          </Card>

          <Card title={`Communication history (${user.communications.length})`}>
            {user.communications.length === 0 ? <Empty>No emails sent yet.</Empty> : (
              <div className="flex flex-col">
                {user.communications.map((c) => (
                  <div key={c.id} className="border-b border-[#f3eff8] py-2.5 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[13px] font-semibold text-ink">{c.subject}</div>
                      <span className="flex-shrink-0 rounded-full bg-surface-lav px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-brand">{c.kind}</span>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-[12px] text-muted">{c.body}</div>
                    <div className="mt-0.5 text-[11px] text-muted-faint">{c.createdAt.toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-faint">Replies go to your support inbox, not the platform. Set a monitored Reply-To to catch them.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, c }: { icon: React.ReactNode; label: string; value: string; c: string }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(60,33,104,.04),0_8px_24px_-16px_rgba(60,33,104,.18)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.07em] text-muted-label">{label}</span>
        <span style={{ color: c }} className="opacity-80">{icon}</span>
      </div>
      <div className="mt-2 font-display text-[22px] font-extrabold tabular-nums tracking-tight text-ink">{value}</div>
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${c}, transparent 85%)` }} />
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-[13px] text-muted">{children}</div>;
}
