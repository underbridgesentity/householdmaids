import { getSessionUser } from "@/lib/rbac";
import { AppSidebar } from "./AppSidebar";
import { BottomTabs } from "./BottomTabs";
import { CUSTOMER_NAV, HELPER_NAV } from "./nav";

/**
 * Device-adaptive app shell.
 *  - Mobile/tablet: full-bleed content + a sticky bottom tab bar.
 *  - Desktop (lg+): a left sidebar nav + a centered, wider content column.
 *
 * Props:
 *  - variant : which nav set + role label (customer | helper)
 *  - sidebar : show the desktop sidebar (off for public pages — no session)
 *  - tabs    : show the mobile bottom tab bar
 *  - narrow  : keep focused flows (booking, payment, chat) centered on desktop
 */
export async function AppShell({
  children, variant = "customer", sidebar = true, tabs = true, narrow = false,
}: {
  children: React.ReactNode;
  variant?: "customer" | "helper";
  sidebar?: boolean;
  tabs?: boolean;
  narrow?: boolean;
}) {
  const nav = variant === "helper" ? HELPER_NAV : CUSTOMER_NAV;
  const roleLabel = variant === "helper" ? "Helper" : "Customer";
  const user = sidebar ? await getSessionUser() : null;

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_80%_-10%,#efe7f6_0%,#ded9e6_55%,#d4cee0_100%)] lg:flex">
      {sidebar && (
        <AppSidebar items={nav} userName={user?.name ?? "You"} userEmail={user?.email ?? undefined} roleLabel={roleLabel} />
      )}
      <div className="flex min-h-[100dvh] w-full flex-1 flex-col">
        <main className="flex flex-1 flex-col">
          <div className={`mx-auto flex w-full flex-1 flex-col ${narrow ? "lg:max-w-[640px]" : "lg:max-w-[1080px]"}`}>
            {children}
          </div>
        </main>
        {tabs && <BottomTabs items={nav} />}
      </div>
    </div>
  );
}

/** A simple screen header with optional back link. */
export function ScreenHeader({
  title, subtitle, back,
}: {
  title: string; subtitle?: string; back?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
      {back}
      <div>
        <div className="font-display text-xl font-extrabold tracking-tight">{title}</div>
        {subtitle && <div className="text-[12.5px] text-muted">{subtitle}</div>}
      </div>
    </div>
  );
}
