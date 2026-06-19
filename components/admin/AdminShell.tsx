"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarRange, Users, UserCog, BadgeCheck, Banknote,
  Ticket, Inbox, BarChart3, Tag, Menu, X, LogOut, Mail, MessageCircle,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/app/actions/auth";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Operations",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarRange },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/support", label: "Support", icon: MessageCircle },
      { href: "/admin/helpers", label: "Helpers", icon: UserCog },
      { href: "/admin/vetting", label: "Vetting", icon: BadgeCheck },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/payouts", label: "Payouts", icon: Banknote },
      { href: "/admin/rewards", label: "Rewards", icon: Ticket },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/marketing", label: "Newsletter", icon: Mail },
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
    ],
  },
  { title: "Catalog", items: [{ href: "/admin/services", label: "Services", icon: Tag }] },
];

function active(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({ children, userName, userEmail, supportUnread = 0 }: { children: React.ReactNode; userName: string; userEmail?: string; supportUnread?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-5 px-3">
      {SECTIONS.map((s) => (
        <div key={s.title}>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-white/35">{s.title}</div>
          <div className="flex flex-col gap-0.5">
            {s.items.map((it) => {
              const on = active(it.href, pathname, it.exact);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-semibold transition ${
                    on ? "bg-white/[.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-white/60 hover:bg-white/[.07] hover:text-white/90"
                  }`}
                >
                  {on && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-orange-brand" />}
                  <it.icon size={17.5} strokeWidth={on ? 2.4 : 2} className={on ? "text-white" : "text-white/55 group-hover:text-white/80"} />
                  <span>{it.label}</span>
                  {it.href === "/admin/support" && supportUnread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-magenta-brand px-1.5 text-[11px] font-bold text-white">{supportUnread}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <Link href="/admin" onClick={() => setOpen(false)}><Logo variant="white" height={26} /></Link>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-white/80 ring-1 ring-inset ring-white/15">Admin</span>
      </div>
      <div className="hm-scroll flex-1 overflow-y-auto pb-6">{nav}</div>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-[12px] bg-white/[.06] px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-magenta-brand to-orange-brand font-display text-[13px] font-bold text-white">{userName?.[0]?.toUpperCase() ?? "A"}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold text-white">{userName}</div>
            <div className="truncate text-[11px] text-white/45">{userEmail}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" aria-label="Log out" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"><LogOut size={15} strokeWidth={2.2} /></button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-admin-grid text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] bg-admin-sidebar lg:block">
        <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-magenta-brand/20 blur-3xl" />
        <div className="relative h-full">{sidebarInner}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin"><Logo height={24} /></Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-lav text-indigo-brand"><Menu size={20} /></button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-admin-sidebar">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"><X size={18} /></button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="lg:pl-[244px]">
        <div className="mx-auto w-full max-w-[1320px] px-5 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
