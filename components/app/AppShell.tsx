import { BottomTabs } from "./BottomTabs";

/**
 * Mobile-first app frame. On large screens it renders inside a centered
 * "phone" so the app keeps its native feel; on phones it's full-bleed.
 */
export function AppShell({ children, tabs = true }: { children: React.ReactNode; tabs?: boolean }) {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_80%_-10%,#efe7f6_0%,#ded9e6_55%,#d4cee0_100%)]">
      {/* Responsive app surface: full-bleed on phones, a centered fluid column on
          larger screens (not a fixed phone mock). Page scrolls naturally; the tab
          bar stays pinned to the viewport bottom. */}
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col bg-surface shadow-[0_0_90px_-28px_rgba(40,25,80,.4)]">
        <div className="flex flex-1 flex-col">{children}</div>
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
