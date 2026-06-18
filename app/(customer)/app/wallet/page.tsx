import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getWallet } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";
import { CopyButton } from "@/components/app/CopyButton";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await requireRole("CUSTOMER");
  const [wallet, settings, code, activity] = await Promise.all([
    getWallet(user.id),
    getSettings(),
    prisma.referralCode.findUnique({ where: { ownerId: user.id } }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id, status: { not: "REVERSED" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  // A profile-linked short link (resolves via /r/[code] → signup with the code pre-filled).
  const link = `${base}/r/${code?.code ?? ""}`;
  const linkDisplay = link.replace(/^https?:\/\//, "");
  const reward = formatZar(settings.referrerRewardCents);

  return (
    <AppShell>
      {/* Balance header */}
      <div className="relative overflow-hidden rounded-b-[28px] bg-wallet-gradient px-5 pb-16 pt-4">
        <div className="absolute -right-10 -top-8 text-[150px] opacity-10">💸</div>
        <div className="relative z-10">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-[.08em] text-white/70">Your wallet</div>
          <div className="text-[13px] text-white/80">Available to withdraw</div>
          <div className="my-1 font-display text-[40px] font-extrabold tracking-tight text-white">{formatZar(wallet.availableCents)}</div>
          <div className="text-[12.5px] text-white/80">+ {formatZar(wallet.pendingCents)} pending · {formatZar(wallet.allTimeEarnedCents)} earned all-time</div>
        </div>
      </div>

      <div className="relative z-10 -mt-11 px-[18px]">
        <div className="flex gap-2.5 rounded-[18px] bg-white p-3.5 shadow-card">
          <Link href="/app/withdraw" className="flex-1 rounded-[14px] bg-brand-gradient py-3.5 text-center font-display text-[14.5px] font-bold text-white">Withdraw</Link>
          <Link href="/app/payouts" className="flex-1 rounded-[14px] border-[1.5px] border-[#e7d7ec] bg-surface-pink py-3.5 text-center font-display text-[14.5px] font-bold text-magenta-brand">Payout history</Link>
        </div>

        {/* Referral link */}
        <div className="mt-4 card p-4">
          <div className="font-display text-base font-bold">Your referral link</div>
          <div className="mb-3 mt-0.5 text-[12.5px] text-muted">Earn {reward} each time a friend&apos;s first booking is paid.</div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-faint">Your shareable link</div>
          <div className="flex items-center gap-2.5 rounded-[13px] border-[1.5px] border-dashed border-[#d9c8e6] bg-surface-lav px-3.5 py-3">
            <div className="flex-1 overflow-hidden">
              <div className="truncate font-display text-[14px] font-bold text-magenta-brand">{linkDisplay}</div>
              <div className="text-[11px] text-muted-faint">Tap copy, then share anywhere.</div>
            </div>
            <CopyButton value={link} />
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-[11px] bg-surface-lav px-3 py-2 text-[12px] text-muted-soft">
            <span>Or share your code</span>
            <span className="font-display font-bold tracking-wide text-indigo-brand">{code?.code}</span>
          </div>
          <div className="mt-3 flex gap-2.5">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Book a clean with Household Maids and we both win! Use my link: ${link}`)}`}
              target="_blank" rel="noreferrer"
              className="flex-1 rounded-[11px] bg-[#25D366] py-2.5 text-center font-display text-[13px] font-bold text-white"
            >
              WhatsApp
            </a>
            <CopyButton value={link} className="flex-1 rounded-[11px] bg-surface-lav py-2.5 text-center font-display text-[13px] font-bold text-indigo-brand" />
          </div>
        </div>

        {/* How it works */}
        <div className="mt-4 rounded-[18px] bg-gradient-to-br from-[#f3ecfa] to-[#fbeef7] p-4">
          <div className="mb-3 font-display text-[15px] font-bold">How referrals work</div>
          {[
            ["1", "Share your link", "Send your unique code to friends & family."],
            ["2", "They book a clean", `New customers get ${formatZar(settings.firstBookingDiscountCents)} off their first clean.`],
            ["3", `You earn ${reward}`, "Paid to your wallet once their booking is paid for."],
          ].map(([n, t, d]) => (
            <div key={n} className="mb-3 flex items-start gap-3">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-magenta-brand font-display text-[13px] font-bold text-white">{n}</div>
              <div>
                <div className="font-display text-sm font-bold">{t}</div>
                <div className="text-[12.5px] leading-snug text-muted-soft">{d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity (referral earnings, booking refunds, payments, payouts) */}
        <h3 className="mb-3 mt-5 px-0.5 font-display text-base font-bold">Recent activity</h3>
        <div className="flex flex-col gap-2.5 pb-6">
          {activity.length === 0 && <div className="card p-4 text-center text-[13px] text-muted">No activity yet. Share your referral link to start earning.</div>}
          {activity.map((t) => {
            const credit = t.amountCents >= 0;
            const icon = t.type === "REFERRAL_REWARD" ? "🤝" : t.type === "WITHDRAWAL" ? "🏦" : credit ? "↩️" : "🧹";
            const label =
              t.ref ??
              (t.type === "REFERRAL_REWARD" ? "Referral reward" : t.type === "WITHDRAWAL" ? "Withdrawal" : credit ? "Refund" : "Booking payment");
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-[15px] border border-line bg-white px-3.5 py-3">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-surface-lav text-[17px]">{icon}</div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold leading-tight">{label}</div>
                  <div className="text-[11.5px] text-muted-faint">{new Date(t.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · {t.status === "PENDING" ? "Pending" : t.status === "EARNED" ? "Available" : "Settled"}</div>
                </div>
                <div className={`font-display text-[14.5px] font-bold ${credit ? "text-money" : "text-ink"}`}>{credit ? "+" : "−"}{formatZar(Math.abs(t.amountCents))}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
