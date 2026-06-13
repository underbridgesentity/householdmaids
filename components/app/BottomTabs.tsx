"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Home", icon: "🏠", href: "/app", match: (p: string) => p === "/app" },
  { label: "Book", icon: "🧹", href: "/app/book", match: (p: string) => p.startsWith("/app/book") },
  { label: "Wallet", icon: "💰", href: "/app/wallet", match: (p: string) => p.startsWith("/app/wallet") || p.startsWith("/app/withdraw") || p.startsWith("/app/payouts") },
  { label: "Chat", icon: "💬", href: "/app/messages", match: (p: string) => p.startsWith("/app/messages") },
  { label: "Profile", icon: "👤", href: "/app/profile", match: (p: string) => p.startsWith("/app/profile") },
];

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="glass sticky bottom-0 z-20 flex h-[72px] items-stretch border-x-0 border-b-0 border-t border-white/40 bg-white/70 px-1.5">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.label}
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
