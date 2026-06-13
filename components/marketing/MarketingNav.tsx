"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const LINKS: [string, string][] = [
  ["Services", "#services"],
  ["How it works", "#how"],
  ["Refer & earn", "#refer"],
  ["Contact", "#contact"],
  ["Become a helper", "/helper"],
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-3 z-40 px-3 md:top-4 md:px-5">
      <div className={`glass mx-auto max-w-6xl px-3 py-2 pl-4 transition-[border-radius] md:px-4 md:py-2.5 md:pl-6 ${open ? "rounded-[28px]" : "rounded-full"}`}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={() => setOpen(false)}><Logo height={38} /></Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-7 lg:flex">
            {LINKS.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} className="text-sm font-semibold text-[#4a4463] transition hover:text-magenta-brand">{label}</a>
              ) : (
                <Link key={label} href={href} className="text-sm font-semibold text-[#4a4463] transition hover:text-magenta-brand">{label}</Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-4 py-2.5 font-display text-sm font-bold text-indigo-brand transition hover:bg-white/70 sm:inline-block">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-orange-brand px-4 py-2.5 font-display text-[13px] font-extrabold text-[#2A1A40] shadow-[0_10px_22px_-10px_rgba(242,150,14,.7)] transition hover:brightness-105 md:px-5 md:text-sm">Book a service</Link>
            {/* Hamburger — mobile/tablet only */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="flex h-10 w-10 items-center justify-center rounded-full text-indigo-brand transition hover:bg-white/70 lg:hidden"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {open ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></> : <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="mt-2 flex flex-col gap-1 border-t border-white/40 pt-2 lg:hidden">
            {LINKS.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 font-display text-[15px] font-semibold text-[#4a4463] transition hover:bg-white/60">{label}</a>
              ) : (
                <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 font-display text-[15px] font-semibold text-[#4a4463] transition hover:bg-white/60">{label}</Link>
              ),
            )}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 font-display text-[15px] font-bold text-indigo-brand transition hover:bg-white/60">Sign in</Link>
          </div>
        )}
      </div>
    </header>
  );
}
