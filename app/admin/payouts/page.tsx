import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { runFridayPayoutAction, approvePayoutAction, holdPayoutAction } from "@/app/actions/admin";

type BankSnapshot = { bank?: string; accountTail?: string; accountType?: string };

function bankLine(snapshot: unknown): string {
  const s = (snapshot ?? {}) as BankSnapshot;
  return `${s.bank ?? "—"} •••• ${s.accountTail ?? "????"}`;
}

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<{ ran?: string }> }) {
  const { ran } = await searchParams;

  const [requested, recentPaid] = await Promise.all([
    prisma.payoutRequest.findMany({
      where: { status: "REQUESTED" },
      include: { user: true },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.payoutRequest.findMany({
      where: { status: "PAID" },
      include: { user: true },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
  ]);

  const totalCents = requested.reduce((t, r) => t + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Payouts queue</h1>
          <p className="mt-1 text-[14px] text-muted">Approve referral &amp; helper payouts, or process the weekly batch.</p>
        </div>
        <form action={runFridayPayoutAction}>
          <button type="submit" disabled={requested.length === 0} className="btn-primary py-3 text-[14px]">
            Run Friday payout · {formatZar(totalCents)}
          </button>
        </form>
      </div>

      {ran ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3 text-[14px] font-semibold text-money">
          ✓ Friday payout run complete.
        </div>
      ) : null}

      {/* Requested queue */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3.5 text-[14px] font-extrabold text-ink">
          Requested ({requested.length})
        </div>
        {requested.length === 0 ? (
          <div className="px-5 py-8 text-center text-[14px] text-muted">No payouts in the queue.</div>
        ) : (
          <div className="divide-y divide-line">
            {requested.map((req) => {
              const approve = approvePayoutAction.bind(null, req.id);
              const hold = holdPayoutAction.bind(null, req.id);
              return (
                <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                    <div className="text-[12.5px] text-muted">{bankLine(req.bankSnapshot)} · {req.reference}</div>
                  </div>
                  <div className="font-display text-[15px] font-extrabold text-ink">{formatZar(req.amountCents)}</div>
                  <div className="flex items-center gap-2">
                    <form action={approve}>
                      <button type="submit" className="rounded-xl bg-brand-gradient px-3.5 py-1.5 text-[13px] font-bold text-white">Approve</button>
                    </form>
                    <form action={hold}>
                      <button type="submit" className="rounded-xl border border-line-input bg-white px-3.5 py-1.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">Hold</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently paid */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3.5 text-[14px] font-extrabold text-ink">Recently paid</div>
        {recentPaid.length === 0 ? (
          <div className="px-5 py-8 text-center text-[14px] text-muted">Nothing paid yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {recentPaid.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{req.user.fullName}</div>
                  <div className="text-[12.5px] text-muted">
                    {bankLine(req.bankSnapshot)} · {req.paidAt ? req.paidAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "—"}
                  </div>
                </div>
                <div className="font-display text-[14px] font-extrabold text-money">{formatZar(req.amountCents)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
