import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { AccountSettingsForms } from "@/components/app/AccountSettingsForms";
import { setMarketingPrefAction } from "@/app/actions/profile";

export const dynamic = "force-dynamic";

export const metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const session = await requireRole("CUSTOMER");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { fullName: true, email: true, phone: true, marketingOptOut: true },
  });
  const optedIn = !user?.marketingOptOut;

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

      {/* Email preferences */}
      <div className="px-[18px] pb-8">
        <div className="rounded-[16px] border border-line bg-white p-4">
          <div className="font-display text-[15px] font-bold text-ink">Email preferences</div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold text-ink">Newsletters &amp; offers</div>
              <div className="mt-0.5 text-[12.5px] text-muted">
                {optedIn
                  ? "You're subscribed to occasional updates and offers. You'll always get essential emails about your bookings and payments."
                  : "You're unsubscribed from marketing. You'll still get essential emails about your bookings and payments."}
              </div>
            </div>
            <form action={setMarketingPrefAction} className="flex-shrink-0">
              <input type="hidden" name="optOut" value={optedIn ? "1" : "0"} />
              <button type="submit" className={`rounded-[11px] px-3.5 py-2 text-[12.5px] font-bold transition ${optedIn ? "border border-line-input bg-white text-indigo-brand hover:bg-surface-lav" : "bg-brand-gradient text-white"}`}>
                {optedIn ? "Unsubscribe" : "Resubscribe"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
