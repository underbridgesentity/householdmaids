"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type NavItem, isActive } from "./nav";

/** Mobile/tablet bottom tab bar (hidden on desktop, where the sidebar takes over). */
export function BottomTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="glass sticky bottom-0 z-20 flex h-[72px] items-stretch border-x-0 border-b-0 border-t border-white/40 bg-white/70 px-1.5 lg:hidden">
      {items.map((t) => {
        const active = isActive(t, pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 ${active ? "text-magenta-brand" : "text-muted-faint"}`}
          >
            <span className="text-[21px]">{t.icon}</span>
            <span className="text-[10.5px] font-bold">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
