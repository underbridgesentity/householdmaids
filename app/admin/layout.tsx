import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { Logo } from "@/components/ui/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate the entire admin surface. Customers/helpers are redirected to their home.
  await requireRole("ADMIN");

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <span className="text-money">●</span>
          <span>admin.householdmaids.co.za</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">
            Log out
          </button>
        </form>
      </header>

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 lg:w-[232px]">
          <div className="flex flex-col gap-5 rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-center justify-between px-1">
              <Logo height={28} />
              <span className="rounded-full bg-surface-lav px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.06em] text-indigo-brand">Admin</span>
            </div>

            <AdminNav />

            {/* Friday payout promo */}
            <div className="mt-1 rounded-2xl bg-brand-gradient p-4 text-white">
              <div className="text-[13px] font-extrabold">Friday payout run</div>
              <p className="mt-1 text-[12px] leading-snug text-white/85">Review the referral &amp; helper queue before processing.</p>
              <Link href="/admin/payouts" className="mt-3 inline-flex rounded-xl bg-white/90 px-3 py-1.5 text-[12.5px] font-bold text-indigo-brand transition hover:bg-white">
                Review
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
