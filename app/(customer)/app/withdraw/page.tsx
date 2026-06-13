import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getWallet } from "@/lib/wallet";
import { decrypt, maskTail } from "@/lib/crypto";
import { formatZar } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";
import { WithdrawForm } from "@/components/app/WithdrawForm";

export const dynamic = "force-dynamic";

export default async function WithdrawPage() {
  const user = await requireRole("CUSTOMER");
  const [wallet, dbUser] = await Promise.all([
    getWallet(user.id),
    prisma.user.findUnique({ where: { id: user.id } }),
  ]);
  const bank = dbUser?.bankAccountEnc
    ? (JSON.parse(decrypt(dbUser.bankAccountEnc)) as { bank: string; accountNumber: string; type?: string; accountType?: string })
    : null;

  return (
    <AppShell tabs={false} narrow>
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
        <Link href="/app/wallet" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</Link>
        <div>
          <div className="font-display text-xl font-extrabold">Withdraw earnings</div>
          <div className="text-[12.5px] text-muted">{formatZar(wallet.availableCents)} available</div>
        </div>
      </div>

      <div className="px-[18px]">
        <div className="card flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef0fb] text-xl">🏦</div>
            <div>
              <div className="font-display text-[14.5px] font-bold">{bank ? bank.bank : "No bank account yet"}</div>
              <div className="text-[12.5px] text-muted">{bank ? `${user.name} · ${maskTail(bank.accountNumber)}` : "Add details to receive payouts"}</div>
            </div>
          </div>
          <Link href="/app/withdraw/bank" className="text-[12.5px] font-bold text-magenta-brand">{bank ? "Edit" : "Add"}</Link>
        </div>
      </div>

      {bank ? (
        <WithdrawForm availableCents={wallet.availableCents} />
      ) : (
        <div className="px-[18px] pt-4">
          <Link href="/app/withdraw/bank" className="btn-primary w-full">Add bank account</Link>
        </div>
      )}
    </AppShell>
  );
}
