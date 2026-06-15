import Link from "next/link";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/ui/Logo";
import { QuoteForm } from "@/components/QuoteForm";
import { ShieldCheck, Building2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request a quote",
  description: "Tell us about your job and we will send a tailored quote, ideal for commercial window cleaning and larger spaces across Gauteng.",
};

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;

  const [services, areas] = await Promise.all([
    prisma.service.findMany({ where: { active: true, quoteOnly: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const initialServiceId = service && services.some((s) => s.id === service) ? service : services[0]?.id;

  return (
    <div className="lg:grid lg:min-h-[100dvh] lg:grid-cols-[minmax(0,400px)_1fr]">
      {/* Desktop brand panel */}
      <aside className="relative hidden overflow-hidden bg-hero-gradient p-9 text-white lg:flex lg:flex-col">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/[.06]" />
        <Link href="/" className="relative z-10" aria-label="Household Maids home"><Logo variant="white" height={30} /></Link>
        <div className="relative z-10 mt-10 flex-1">
          <h2 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-tight">Tell us about the job, we will send a price</h2>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">Some jobs are easier to quote once we know the detail, like commercial window cleaning, high or hard-to-reach panes, and larger spaces.</p>
          <div className="mt-9 flex flex-col gap-3.5 text-sm font-semibold text-white/90">
            <div className="flex items-center gap-2.5"><Building2 size={18} strokeWidth={2.2} /> Homes &amp; businesses welcome</div>
            <div className="flex items-center gap-2.5"><ShieldCheck size={18} strokeWidth={2.2} /> Vetted &amp; insured cleaners</div>
            <div className="flex items-center gap-2.5"><Clock size={18} strokeWidth={2.2} /> Fast turnaround on quotes</div>
          </div>
        </div>
        <div className="relative z-10 text-[12px] text-white/55">© 2026 Household Maids · Mukhoni Cleaning Specialists</div>
      </aside>

      {/* Form side */}
      <div className="flex min-h-[100dvh] flex-col bg-surface">
        <div className="flex items-center justify-between border-b border-line bg-white/70 px-5 py-3 backdrop-blur lg:hidden">
          <Link href="/" aria-label="Household Maids home"><Logo height={28} /></Link>
          <Link href="/book" className="text-[13px] font-bold text-magenta-brand">Book instead</Link>
        </div>

        <div className="mx-auto w-full max-w-[600px] flex-1 px-5 py-7 lg:py-10">
          <div className="mb-1 font-display text-2xl font-extrabold">Request a quote</div>
          <p className="mb-6 text-[13.5px] text-muted">Share a few details and we will get back to you with a tailored price. No account needed.</p>

          {services.length === 0 ? (
            <div className="card p-6 text-center text-[14px] text-muted">
              Quote-based services are not available right now.{" "}
              <Link href="/book" className="font-semibold text-magenta-brand">Book an instant service</Link> instead.
            </div>
          ) : (
            <QuoteForm
              services={services.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, description: s.description }))}
              areas={areas.map((a) => ({ id: a.id, name: a.name }))}
              initialServiceId={initialServiceId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
