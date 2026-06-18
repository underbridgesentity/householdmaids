import Link from "next/link";
import { Download, Banknote } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { PageHeader } from "@/components/admin/PageHeader";
import { runFridayPayoutAction, approvePayoutAction, holdPayoutAction, releasePayoutAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

type BankSnapshot = { bank?: string; accountTail?: string; accountType?: string };
function bankLine(snapshot: unknown): string {
  const s = (snapshot ?? {}) as BankSnapshot;
  return `${s.bank ?? "—"} •••• ${s.accountTail ?? "????"}`;
}

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ ran?: string; cycle?: string }> }) {
  const { ran, cycle } = await searchParams;

  const [requested, held, recentPaid] = await Promise.all([
    prisma.payoutRequest.findMany({ where: { status: "REQUESTED" }, include: { user: true }, orderBy: { requestedAt: "asc" } }),
    prisma.payoutRequest.findMany({ where: { status: "HELD" }, include: { user: true }, orderBy: { requestedAt: "asc" } }),
    prisma.payoutRequest.findMany({ where: { status: "PAID" }, include: { user: true }, orderBy: { paidAt: "desc" }, take: 10 }),
  ]);

  const totalCents = requested.reduce((t, r) => t + r.amountCents, 0);
  const heldCents = held.reduce((t, r) => t + r.amountCents, 0);

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Approve referral & helper payouts, or run the weekly batch"
        actions={
          <form action={runFridayPayoutAction}>
            <button type="submit" disabled={requested.length === 0} className="inline-flex items-center gap-2 rounded-[12px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40">
              <Banknote size={16} /> Run Friday payout · {formatZar(totalCents)}
            </button>
          </form>
        }
      />

      {ran === "1" ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3 text-[13.5px] font-semibold text-money">
          <span>✓ Friday payout run complete. Download the bank batch file to make the transfers.</span>
          {cycle ? <a href={`/api/payout-batch/${cycle}`} className="rounded-lg bg-money px-3 py-1.5 text-[13px] font-bold text-white">Download CSV</a> : null}
        </div>
      ) : ran === "0" ? (
        <div className="mb-5 rounded-[14px] border border-line bg-surface-lav px-4 py-3 text-[13.5px] font-semibold text-muted-label">Nothing to pay out — the queue was empty.</div>
      ) : null}

      {/* Requested */}
      <Section title="Requested" count={requested.length} sub={requested.length ? formatZar(totalCents) : undefined}>
        {requested.length === 0 ? <Empty>No payouts in the queue.</Empty> : (
          <div className="divide-y divide-line">
            {requested.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                  <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.reference}</div>
                </div>
                <div className="font-display text-[15px] font-extrabold tabular-nums text-ink">{formatZar(req.amountCents)}</div>
                <div className="flex items-center gap-2">
                  <a href={`/api/payout-batch/single/${req.id}`} title="Download bank details" className="inline-flex items-center gap-1.5 rounded-xl border border-line-input bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-indigo-brand transition hover:bg-surface-lav"><Download size={14} /></a>
                  <form action={approvePayoutAction.bind(null, req.id)}><button type="submit" className="rounded-xl bg-brand-gradient px-3.5 py-1.5 text-[13px] font-bold text-white">Approve</button></form>
                  <form action={holdPayoutAction.bind(null, req.id)}><button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">Hold</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Held */}
      {held.length > 0 && (
        <div className="mt-5">
          <Section title="On hold" count={held.length} sub={formatZar(heldCents)} tone="warn">
            <div className="divide-y divide-line">
              {held.map((req) => (
                <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                    <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.reference}</div>
                  </div>
                  <div className="font-display text-[15px] font-extrabold tabular-nums text-orange-deep">{formatZar(req.amountCents)}</div>
                  <form action={releasePayoutAction.bind(null, req.id)}>
                    <button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-bold text-money transition hover:bg-[#eef6f0]">Release to queue</button>
                  </form>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Recently paid */}
      <div className="mt-5">
        <Section title="Recently paid" count={recentPaid.length}>
          {recentPaid.length === 0 ? <Empty>Nothing paid yet.</Empty> : (
            <div className="divide-y divide-line">
              {recentPaid.map((req) => (
                <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                    <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.paidAt ? req.paidAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—"}</div>
                  </div>
                  <div className="font-display text-[14px] font-extrabold tabular-nums text-money">{formatZar(req.amountCents)}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, sub, tone, children }: { title: string; count: number; sub?: string; tone?: "warn"; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
      <div className="flex items-center justify-between border-b border-line bg-[#faf8fc] px-5 py-3">
        <span className={`text-[13.5px] font-extrabold ${tone === "warn" ? "text-orange-deep" : "text-ink"}`}>{title} ({count})</span>
        {sub && <span className="font-display text-[13px] font-bold tabular-nums text-muted-label">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-8 text-center text-[14px] text-muted">{children}</div>;
}
