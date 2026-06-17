import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getWallet } from "@/lib/wallet";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const MENU: { icon: string; label: string; sub: string; href: string; external?: boolean }[] = [
  { icon: "👤", label: "Account settings", sub: "Name, email & password", href: "/app/profile/settings" },
  { icon: "📄", label: "Booking history", sub: "View your cleans", href: "/app/bookings" },
  { icon: "💰", label: "Wallet & referrals", sub: "Earnings & payouts", href: "/app/wallet" },
  { icon: "🏦", label: "Banking details", sub: "For referral payouts", href: "/app/withdraw/bank" },
  { icon: "💬", label: "Help & support", sub: "Chat to us on WhatsApp", href: "https://wa.me/27620324931", external: true },
];

export default async function ProfilePage() {
  const user = await requireRole("CUSTOMER");
  const [wallet, counts] = await Promise.all([
    getWallet(user.id),
    // Count completed cleans only, not pending/unpaid bookings.
    prisma.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
  ]);
  const referred = await prisma.referral.count({ where: { referrerId: user.id } });

  return (
    <AppShell>
      <div className="rounded-b-[26px] bg-brand-gradient-160 px-5 pb-7 pt-5 text-center">
        <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/[.18] font-display text-3xl font-bold text-white">{user.name?.[0]}</div>
        <div className="font-display text-[19px] font-bold text-white">{user.name}</div>
        <div className="text-[12.5px] text-white/75">{user.email}</div>
        <div className="mt-4 flex justify-center gap-7">
          {[[counts, "Cleans"], [referred, "Referred"], [formatZar(wallet.allTimeEarnedCents), "Earned"]].map(([n, l]) => (
            <div key={l as string}>
              <div className="font-display text-lg font-extrabold text-white">{n}</div>
              <div className="text-[11px] text-white/70">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-[18px] py-4">
        <div className="card overflow-hidden">
          {MENU.map((m) =>
            m.external ? (
              <a key={m.label} href={m.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-[#f3eff8] px-4 py-3.5 last:border-0">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-surface-lav text-lg">{m.icon}</div>
                <div className="flex-1">
                  <div className="font-display text-[14.5px] font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-faint">{m.sub}</div>
                </div>
                <span className="text-lg text-[#cfc6dd]" aria-hidden>›</span>
              </a>
            ) : (
              <Link key={m.label} href={m.href} className="flex items-center gap-3 border-b border-[#f3eff8] px-4 py-3.5 last:border-0">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-surface-lav text-lg">{m.icon}</div>
                <div className="flex-1">
                  <div className="font-display text-[14.5px] font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-faint">{m.sub}</div>
                </div>
                <span className="text-lg text-[#cfc6dd]" aria-hidden>›</span>
              </Link>
            ),
          )}
        </div>

        <Link href="/helper" className="mt-3.5 flex items-center gap-3 rounded-2xl border border-[#ecdcf0] bg-gradient-to-br from-[#f3ecfa] to-[#fbeef7] p-4">
          <div className="text-2xl">🧽</div>
          <div className="flex-1">
            <div className="font-display text-sm font-bold text-indigo-brand">Want to earn as a cleaner?</div>
            <div className="text-xs text-muted-soft">Apply to join our vetted helper team.</div>
          </div>
          <span className="text-lg text-magenta-brand">›</span>
        </Link>

        <form action={logoutAction} className="mt-3.5 lg:hidden">
          <button className="w-full rounded-[14px] border-[1.5px] border-[#f0d6d6] bg-white py-3.5 font-display text-sm font-bold text-[#d05656]">Log out</button>
        </form>
      </div>
    </AppShell>
  );
}
