import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ requested?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { requested } = await searchParams;
  const payouts = await prisma.payoutRequest.findMany({ where: { userId: user.id }, orderBy: { requestedAt: "desc" } });
  const pending = payouts.filter((p) => p.status === "REQUESTED" || p.status === "PROCESSING");
  const completed = payouts.filter((p) => p.status === "PAID");

  return (
    <AppShell>
      <div className="flex items-center gap-3 px-5 pb-4 pt-2">
        <Link href="/app/wallet" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</Link>
        <div className="font-display text-xl font-extrabold">Payout history</div>
      </div>

      <div className="px-[18px] pb-6">
        {requested && (
          <div className="mb-4 rounded-2xl border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3 text-[13px] font-semibold text-money-dark">
            ✓ Payout requested, it&apos;ll be paid out this Friday.
          </div>
        )}

        {pending.length > 0 && (
          <>
            <div className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#4A56C7]">In progress</div>
            <div className="mb-4 flex flex-col gap-2.5">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-[15px] border-[1.5px] border-[#dfe2f7] bg-white p-3.5">
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#eef0fb] text-[19px]">⏳</div>
                  <div className="flex-1">
                    <div className="font-display text-[15px] font-bold">{formatZar(p.amountCents)}</div>
                    <div className="text-xs text-muted">Requested · pays Fri · {p.reference}</div>
                  </div>
                  <span className="rounded-md bg-[#eef0fb] px-2.5 py-1 text-[11px] font-bold text-[#4A56C7]">Processing</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-faint">Completed</div>
        <div className="flex flex-col gap-2.5">
          {completed.length === 0 && <div className="card p-4 text-center text-[13px] text-muted">No completed payouts yet.</div>}
          {completed.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-[15px] border border-line bg-white p-3.5">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#e6f6ed] text-[19px]">✓</div>
              <div className="flex-1">
                <div className="font-display text-[15px] font-bold">{formatZar(p.amountCents)}</div>
                <div className="text-xs text-muted">{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }) : ""} · {p.reference}</div>
              </div>
              <span className="rounded-md bg-[#e6f6ed] px-2.5 py-1 text-[11px] font-bold text-money">Paid</span>
            </div>
          ))}
        </div>

        <a href="/api/statement" className="mt-5 block w-full rounded-[14px] border-[1.5px] border-[#e0d8ea] bg-white py-3 text-center font-display text-[13.5px] font-bold text-indigo-brand">
          ⤓ Download statement (CSV)
        </a>
      </div>
    </AppShell>
  );
}
