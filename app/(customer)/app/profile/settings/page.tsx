import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { AccountSettingsForms } from "@/components/app/AccountSettingsForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const session = await requireRole("CUSTOMER");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { fullName: true, email: true, phone: true },
  });

  return (
    <AppShell tabs={false} narrow>
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
        <Link href="/app/profile" className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand" aria-label="Back to profile">‹</Link>
        <div>
          <div className="font-display text-xl font-extrabold">Account settings</div>
          <div className="text-[12.5px] text-muted">Update your details and password</div>
        </div>
      </div>
      <AccountSettingsForms
        fullName={user?.fullName ?? ""}
        email={user?.email ?? ""}
        phone={user?.phone ?? ""}
      />
    </AppShell>
  );
}
