"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/rewards", label: "Rewards & discounts", icon: "🎟️" },
  { href: "/admin/services", label: "Services & pricing", icon: "🏷️" },
  { href: "/admin/payouts", label: "Payouts queue", icon: "💸" },
  { href: "/admin/vetting", label: "Helper vetting", icon: "✅" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        // Exact match for the dashboard root; prefix match for the rest.
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[14.5px] font-semibold transition " +
              (active ? "bg-brand-gradient text-white shadow-[0_12px_22px_-14px_rgba(120,40,130,.8)]" : "text-[#5f5878] hover:bg-surface-lav")
            }
          >
            <span className="text-[17px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
