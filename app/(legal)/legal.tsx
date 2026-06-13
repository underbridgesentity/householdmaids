import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/** Shared shell for legal/policy pages. */
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 px-5 py-3.5 backdrop-blur md:px-9">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" aria-label="Household Maids home"><Logo height={40} /></Link>
          <Link href="/" className="text-sm font-semibold text-magenta-brand">← Back to site</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-0">
        <h1 className="font-display text-[34px] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-soft">Last updated {updated}</p>
        <div className="legal mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-[#3f3a57]">{children}</div>
        <div className="mt-12 rounded-2xl bg-surface-lav px-5 py-4 text-[13px] text-muted-soft">
          Questions? Email <a href="mailto:info@householdmaids.co.za" className="font-semibold text-magenta-brand">info@householdmaids.co.za</a> or call 062 032 4931.
        </div>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-bold text-indigo-brand">{heading}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
