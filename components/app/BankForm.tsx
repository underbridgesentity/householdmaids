"use client";

import { useActionState } from "react";
import { saveBankAccountAction, type BankState } from "@/app/actions/wallet";

// Major South African retail banks (universal branch codes, so no branch needed).
const SA_BANKS = [
  "Absa",
  "African Bank",
  "Bank Zero",
  "Bidvest Bank",
  "Capitec",
  "Discovery Bank",
  "First National Bank (FNB)",
  "Investec",
  "Nedbank",
  "Old Mutual",
  "Standard Bank",
  "TymeBank",
  "Other",
];

const ACCOUNT_TYPES = ["Cheque / Current", "Savings", "Transmission"];

export function BankForm({
  initial,
}: {
  initial: { bank?: string; accountHolder?: string; accountNumber?: string; type?: string } | null;
}) {
  const [state, action, pending] = useActionState<BankState, FormData>(saveBankAccountAction, undefined);
  const saved = !!initial?.accountNumber;

  return (
    <form action={action} className="flex flex-col gap-3.5 px-[18px]">
      {saved && (
        <div className="rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3 text-[12.5px] font-semibold text-money-dark">
          Banking details on file. Update them below if anything has changed.
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="label">Bank</span>
        <select name="bank" defaultValue={initial?.bank ?? ""} required className="field bg-white">
          <option value="" disabled>Select your bank</option>
          {SA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Account holder</span>
        <input name="accountHolder" defaultValue={initial?.accountHolder ?? ""} required placeholder="Name as it appears on the account" className="field bg-white" autoComplete="name" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Account number</span>
        <input name="accountNumber" defaultValue={initial?.accountNumber ?? ""} required inputMode="numeric" pattern="\d{4,20}" placeholder="Digits only" className="field bg-white" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Account type</span>
        <select name="accountType" defaultValue={initial?.type ?? "Cheque / Current"} required className="field bg-white">
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <div className="flex gap-3 rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3">
        <span className="text-[17px]">🔒</span>
        <span className="text-[12.5px] leading-snug text-money-dark">Your banking details are encrypted and used only for weekly payouts.</span>
      </div>

      {state?.error && (
        <div className="rounded-xl border border-[#f0d6d6] bg-[#fdf3f3] px-3.5 py-2.5 text-[13px] font-semibold text-[#d05656]">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-1 w-full disabled:opacity-50">
        {pending ? "Saving…" : saved ? "Update banking details" : "Save banking details"}
      </button>
    </form>
  );
}
