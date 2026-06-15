import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { decrypt } from "@/lib/crypto";
import { AppShell } from "@/components/app/AppShell";
import { BankForm } from "@/components/app/BankForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Banking details" };

export default async function BankPage() {
  const session = await requireRole("CUSTOMER");
  const dbUser = await prisma.user.findUnique({ where: { id: session.id }, select: { bankAccountEnc: true } });

  let initial: { bank?: string; accountHolder?: string; accountNumber?: string; type?: string } | null = null;
  if (dbUser?.bankAccountEnc) {
    try {
      const b = JSON.parse(decrypt(dbUser.bankAccountEnc)) as { bank?: string; accountHolder?: string; accountNumber?: string; type?: string; accountType?: string };
      initial = { bank: b.bank, accountHolder: b.accountHolder, accountNumber: b.accountNumber, type: b.type ?? b.accountType };
    } catch {
      initial = null; // unreadable blob (e.g. key change) - let them re-enter
    }
  }

  return (
    <AppShell tabs={false} narrow center>
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
        <Link href="/app/withdraw" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand" aria-label="Back">‹</Link>
        <div>
          <div className="font-display text-xl font-extrabold">Banking details</div>
          <div className="text-[12.5px] text-muted">Where we send your referral payouts</div>
        </div>
      </div>
      <BankForm initial={initial} />
    </AppShell>
  );
}
