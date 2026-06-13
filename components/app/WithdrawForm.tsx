"use client";

import { useActionState, useState } from "react";
import { requestWithdrawalAction, type WithdrawState } from "@/app/actions/wallet";
import { formatZar } from "@/lib/money";

export function WithdrawForm({ availableCents }: { availableCents: number }) {
  const [rands, setRands] = useState(Math.round(availableCents / 100));
  const cents = Math.min(availableCents, Math.max(0, Math.round(rands * 100)));
  const [state, action, pending] = useActionState<WithdrawState, FormData>(
    (prev, fd) => {
      fd.set("amountCents", String(cents));
      return requestWithdrawalAction(prev, fd);
    },
    undefined,
  );

  return (
    <form action={action} className="flex min-h-screen flex-col md:min-h-0 md:h-full">
      <div className="flex-1 px-[18px]">
        {state?.error && (
          <div className="mb-3.5 rounded-2xl border border-[#f0d6d6] bg-[#fdf3f3] px-4 py-3 text-sm font-semibold text-[#d05656]">
            {state.error}
          </div>
        )}
        <div className="mb-3.5 card p-5 text-center">
          <div className="text-xs uppercase tracking-wide text-muted">Amount</div>
          <div className="my-2 flex items-center justify-center gap-1">
            <span className="font-display text-3xl font-extrabold text-indigo-brand">R</span>
            <input
              type="number"
              inputMode="numeric"
              aria-label="Withdrawal amount in rand"
              value={rands}
              min={0}
              max={Math.round(availableCents / 100)}
              onChange={(e) => setRands(Number(e.target.value))}
              className="w-[140px] border-none bg-transparent text-center font-display text-[38px] font-extrabold text-indigo-brand outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setRands(Math.round(availableCents / 100))}
            className="rounded-full bg-surface-lav px-3.5 py-1.5 text-[12.5px] font-bold text-muted-label"
          >
            Withdraw all ({formatZar(availableCents)})
          </button>
        </div>

        <div className="rounded-2xl border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3.5">
          <div className="flex gap-3">
            <span className="text-[19px]">📅</span>
            <div className="text-[13px] leading-relaxed text-money-dark">
              <strong>Weekly payout cycle.</strong> Requests made by <strong>Thursday 23:59</strong> are paid out every{" "}
              <strong>Friday</strong>. No minimum, no fees.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-[#ece6f3] bg-white px-[18px] pb-[18px] pt-3.5">
        <button type="submit" disabled={pending || cents <= 0} className="btn-primary w-full disabled:opacity-50">
          {pending ? "Requesting…" : `Request ${formatZar(cents)} payout`}
        </button>
      </div>
    </form>
  );
}
