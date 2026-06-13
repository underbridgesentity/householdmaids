import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { saveBankAccountAction } from "@/app/actions/wallet";

export default async function BankPage() {
  await requireRole("CUSTOMER");
  return (
    <AppShell tabs={false}>
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
        <Link href="/app/withdraw" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</Link>
        <div className="font-display text-xl font-extrabold">Banking details</div>
      </div>
      <form action={saveBankAccountAction} className="flex flex-col gap-3.5 px-[18px]">
        <input name="bank" required placeholder="Bank" className="field bg-white" />
        <input name="accountNumber" required placeholder="Account number" className="field bg-white" />
        <input name="accountType" required defaultValue="Cheque / Current" placeholder="Account type" className="field bg-white" />
        <div className="flex gap-3 rounded-[14px] border border-[#cfe8d8] bg-[#eef6f0] px-4 py-3">
          <span className="text-[17px]">🔒</span>
          <span className="text-[12.5px] leading-snug text-money-dark">Your banking details are encrypted and used only for weekly payouts.</span>
        </div>
        <button type="submit" className="btn-primary mt-1 w-full">Save banking details</button>
      </form>
    </AppShell>
  );
}
