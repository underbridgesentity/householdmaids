import { BottomTabs } from "./BottomTabs";

/**
 * Mobile-first app frame. On large screens it renders inside a centered
 * "phone" so the app keeps its native feel; on phones it's full-bleed.
 */
export function AppShell({ children, tabs = true }: { children: React.ReactNode; tabs?: boolean }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,#efe7f6_0%,#ded9e6_55%,#d4cee0_100%)] md:flex md:items-center md:justify-center md:py-8">
      <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-surface md:min-h-0 md:h-[840px] md:w-[420px] md:rounded-[40px] md:border md:border-[#cdc4dd] md:shadow-phone">
        <div className="hm-scroll flex-1 overflow-y-auto">{children}</div>
        {tabs && <BottomTabs />}
      </div>
    </div>
  );
}

/** A simple screen header with optional back link. */
export function ScreenHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: React.ReactNode;
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
