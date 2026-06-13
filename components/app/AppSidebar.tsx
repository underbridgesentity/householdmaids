"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/app/actions/auth";
import { type NavItem, isActive } from "./nav";

/** Desktop-only left navigation rail for the customer / helper apps. */
export function AppSidebar({
  items, userName, userEmail, roleLabel,
}: {
  items: NavItem[]; userName: string; userEmail?: string; roleLabel: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-line bg-white/70 px-4 py-5 backdrop-blur lg:flex">
      <div className="px-2 pb-6">
        <Link href={items[0]?.href ?? "/app"}><Logo height={40} /></Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 font-display text-[14.5px] font-semibold transition ${
                active ? "bg-brand-gradient text-white shadow-card" : "text-[#5f5878] hover:bg-surface-lav"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-2xl border border-line bg-surface-lav/60 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient font-display font-bold text-white">
            {userName?.[0] ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[13.5px] font-bold">{userName}</div>
            <div className="text-[11px] uppercase tracking-wide text-magenta-brand">{roleLabel}</div>
          </div>
        </div>
        <form action={logoutAction} className="mt-2.5">
          <button className="w-full rounded-xl border border-line bg-white py-2 font-display text-[12.5px] font-bold text-[#d05656] transition hover:bg-[#fdf3f3]">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
