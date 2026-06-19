import Link from "next/link";
import { Download, FileDown, ShieldCheck, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { PageHeader } from "@/components/admin/PageHeader";
import { exportPayoutBatchAction, confirmPayoutBatchAction, approvePayoutAction, holdPayoutAction, releasePayoutAction, cancelPayoutAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

type BankSnapshot = { bank?: string; accountTail?: string; accountType?: string };
function bankLine(snapshot: unknown): string {
  const s = (snapshot ?? {}) as BankSnapshot;
  return `${s.bank ?? "—"} •••• ${s.accountTail ?? "????"}`;
}

const MSG: Record<string, { ok: boolean; text: string }> = {
  confirmed: { ok: true, text: "Batch confirmed as paid. Affiliates were notified and can see the proof." },
  empty: { ok: false, text: "Nothing to export — there are no requested payouts." },
  nothing: { ok: false, text: "That batch had nothing left to confirm." },
  badproof: { ok: false, text: "Proof must be an image or PDF no larger than 8MB." },
};

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ exported?: string; msg?: string }> }) {
  const { exported, msg } = await searchParams;

  const [requested, held, cycles] = await Promise.all([
    prisma.payoutRequest.findMany({ where: { status: "REQUESTED" }, include: { user: true }, orderBy: { requestedAt: "asc" } }),
    prisma.payoutRequest.findMany({ where: { status: "HELD" }, include: { user: true }, orderBy: { requestedAt: "asc" } }),
    prisma.payoutCycle.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { requests: { select: { amountCents: true, status: true } } } }),
  ]);

  const totalCents = requested.reduce((t, r) => t + r.amountCents, 0);
  const banner = msg ? MSG[msg] : null;

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Export the batch, pay it in your bank, then confirm it here"
        actions={
          <form action={exportPayoutBatchAction}>
            <button type="submit" disabled={requested.length === 0} className="inline-flex items-center gap-2 rounded-[12px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40">
              <FileDown size={16} /> Export batch · {formatZar(totalCents)}
            </button>
          </form>
        }
      />

      {/* How it works */}
      <div className="mb-5 grid grid-cols-1 gap-2 rounded-[14px] border border-line bg-white p-4 text-[12.5px] text-muted sm:grid-cols-3">
        <Step n={1} title="Export batch">Bundles every requested payout into a dated batch and downloads a bank CSV.</Step>
        <Step n={2} title="Pay in your bank">Load the CSV / capture the transfers in your own banking — no banking is connected here.</Step>
        <Step n={3} title="Confirm paid">Mark the batch paid (attach proof if you like). Affiliates are notified and see the proof.</Step>
      </div>

      {exported ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3 text-[13.5px] font-semibold text-money">
          <span>✓ Batch exported. Download the bank file, make the transfers, then confirm it below.</span>
          <a href={`/api/payout-batch/${exported}`} className="inline-flex items-center gap-1.5 rounded-lg bg-money px-3 py-1.5 text-[13px] font-bold text-white"><Download size={14} /> Download CSV</a>
        </div>
      ) : banner ? (
        <div className={`mb-5 rounded-[14px] border px-4 py-3 text-[13.5px] font-semibold ${banner.ok ? "border-[#cfe8d8] bg-[#eef6f0] text-money" : "border-[#f3d9c4] bg-[#fdf3e7] text-orange-deep"}`}>{banner.text}</div>
      ) : null}

      {/* Requested */}
      <Section title="Requested" count={requested.length} sub={requested.length ? formatZar(totalCents) : undefined}>
        {requested.length === 0 ? <Empty>No payouts in the queue. Requests appear here as affiliates withdraw.</Empty> : (
          <div className="divide-y divide-line">
            {requested.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                  <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.reference}</div>
                </div>
                <div className="font-display text-[15px] font-extrabold tabular-nums text-ink">{formatZar(req.amountCents)}</div>
                <div className="flex items-center gap-2">
                  <a href={`/api/payout-batch/single/${req.id}`} title="Download bank details" className="inline-flex items-center rounded-xl border border-line-input bg-white px-2.5 py-1.5 text-indigo-brand transition hover:bg-surface-lav"><Download size={14} /></a>
                  <form action={approvePayoutAction.bind(null, req.id)}><button type="submit" className="rounded-xl bg-brand-gradient px-3.5 py-1.5 text-[13px] font-bold text-white">Mark paid</button></form>
                  <form action={holdPayoutAction.bind(null, req.id)}><button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">Hold</button></form>
                  <form action={cancelPayoutAction.bind(null, req.id)}><button type="submit" title="Cancel & refund to wallet" className="rounded-xl border border-[#f1c9c9] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-red-500 transition hover:bg-[#fdf2f2]">Cancel</button></form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Held */}
      {held.length > 0 && (
        <div className="mt-5">
          <Section title="On hold" count={held.length} sub={formatZar(held.reduce((t, r) => t + r.amountCents, 0))} tone="warn">
            <div className="divide-y divide-line">
              {held.map((req) => (
                <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                    <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.reference}</div>
                  </div>
                  <div className="font-display text-[15px] font-extrabold tabular-nums text-orange-deep">{formatZar(req.amountCents)}</div>
                  <div className="flex items-center gap-2">
                    <form action={releasePayoutAction.bind(null, req.id)}><button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-bold text-money transition hover:bg-[#eef6f0]">Release to queue</button></form>
                    <form action={cancelPayoutAction.bind(null, req.id)}><button type="submit" title="Cancel & refund to wallet" className="rounded-xl border border-[#f1c9c9] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-red-500 transition hover:bg-[#fdf2f2]">Cancel &amp; refund</button></form>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Batches (weekly history) */}
      <div className="mt-5">
        <Section title="Batches" count={cycles.length}>
          {cycles.length === 0 ? <Empty>No batches yet. Export your first one above.</Empty> : (
            <div className="divide-y divide-line">
              {cycles.map((c) => {
                const total = c.requests.reduce((t, r) => t + r.amountCents, 0);
                const paid = !!c.paidAt;
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                        Batch · {c.label}
                        {paid
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f6ed] px-2 py-0.5 text-[10.5px] font-bold text-money"><CheckCircle2 size={11} /> Paid</span>
                          : <span className="rounded-full bg-[#fdf0dc] px-2 py-0.5 text-[10.5px] font-bold text-orange-deep">Awaiting confirmation</span>}
                      </div>
                      <div className="text-[12px] text-muted">{c.requests.length} payout{c.requests.length === 1 ? "" : "s"} · {formatZar(total)}{paid && c.paidAt ? ` · paid ${c.paidAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}` : ""}</div>
                    </div>
                    <a href={`/api/payout-batch/${c.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-line-input bg-white px-3 py-1.5 text-[12.5px] font-bold text-indigo-brand transition hover:bg-surface-lav"><Download size={14} /> CSV</a>
                    {paid ? (
                      c.proofKey ? <a href={`/api/payout-batch/${c.id}/proof`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line-input bg-white px-3 py-1.5 text-[12.5px] font-bold text-magenta-brand transition hover:bg-surface-pink/50"><ShieldCheck size={14} /> Proof</a> : null
                    ) : (
                      <form action={confirmPayoutBatchAction} className="flex items-center gap-2">
                        <input type="hidden" name="cycleId" value={c.id} />
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line-input bg-white px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-lav">
                          <input type="file" name="proof" accept="image/*,application/pdf" className="hidden" />
                          Attach proof
                        </label>
                        <button type="submit" className="rounded-xl bg-money px-3.5 py-1.5 text-[13px] font-bold text-white">Confirm paid</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-brand text-[12px] font-bold text-white">{n}</span>
      <div><div className="text-[13px] font-bold text-ink">{title}</div><div className="mt-0.5 leading-snug">{children}</div></div>
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
