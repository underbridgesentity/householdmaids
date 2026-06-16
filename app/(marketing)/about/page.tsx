import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, HeartHandshake, Gift, Sparkles, BadgeCheck, MapPin, Leaf, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatZar } from "@/lib/money";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About us",
  description:
    "Household Maids is a Gauteng cleaning service operated by Mukhoni Cleaning Specialists. Vetted, insured cleaners for homes and businesses, and rewards on every referral.",
};

const VALUES = [
  { icon: ShieldCheck, title: "Trust first", body: "Every cleaner is identity-verified, reference-checked and police-cleared before they ever reach your door." },
  { icon: HeartHandshake, title: "Fair work", body: "We pay our helpers fairly and on time, with a transparent weekly payout run. Good work deserves good pay." },
  { icon: Gift, title: "Rewarding loyalty", body: "Refer a friend and earn cash every time they book. Your network becomes real income, paid into your wallet." },
  { icon: Sparkles, title: "Quality you can see", body: "From a standard tidy to a deep clean or commercial site, we hold every job to the same high standard." },
];

const VETTING = [
  "Government ID verification",
  "Police clearance & background check",
  "Contactable work references",
  "In-person onboarding & training",
  "Ongoing customer ratings",
  "Insured against accidental damage",
];

export default async function AboutPage() {
  const [areas, settings] = await Promise.all([
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  const reward = formatZar(settings.referrerRewardCents);

  return (
    <div className="bg-white text-ink">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-white/5" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 text-center md:px-9 md:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-brand" />
            <span className="text-[12.5px] font-bold tracking-wide text-white">OUR STORY</span>
          </div>
          <h1 className="font-display text-[clamp(32px,4.4vw,48px)] font-extrabold leading-[1.06] tracking-tight text-white">
            Cleaning Gauteng cares about, <span className="text-orange-brand">people first.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-white/80">
            Household Maids connects homes and businesses across Gauteng with trusted, vetted cleaners, and rewards the
            community that grows us. We are proudly operated by Mukhoni Cleaning Specialists (Pty) Ltd.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="rounded-2xl bg-orange-brand px-7 py-4 font-display text-base font-extrabold text-[#2A1A40] shadow-[0_18px_32px_-14px_rgba(242,150,14,.55)]">Book a service</Link>
            <Link href="/helper" className="rounded-2xl border-[1.5px] border-white/45 bg-white/10 px-6 py-4 font-display text-base font-bold text-white">Become a helper</Link>
          </div>
        </div>
      </section>

      {/* Story + image */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-9">
        <div className="relative h-72 w-full overflow-hidden rounded-[28px] shadow-2xl md:h-96">
          <Image src="/photos/helper.jpg" alt="A Household Maids cleaner at work" fill sizes="(max-width:768px) 100vw, 540px" className="object-cover" />
        </div>
        <div>
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-[.12em] text-magenta-brand">Who we are</div>
          <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">A modern cleaning service built on trust</h2>
          <div className="mt-4 flex flex-col gap-3.5 text-[15.5px] leading-relaxed text-[#4a4463]">
            <p>
              We started Household Maids because booking a reliable, trustworthy cleaner in Gauteng was harder than it
              should be. People wanted someone vetted and insured. Cleaners wanted steady, fairly-paid work. We built one
              platform that serves both.
            </p>
            <p>
              In under a minute you can book a clean, track your cleaner on the way, pay securely, and rate the job. Every
              cleaner on the platform is screened and supported, and every customer who refers a friend earns {reward}.
            </p>
            <p>
              We are a local team operating from Kempton Park and Middelburg, growing carefully across Gauteng, one
              spotless home and happy cleaner at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Mission band */}
      <section className="bg-surface-lav px-6 py-14 md:px-9">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white"><Leaf size={22} strokeWidth={2.2} /></div>
          <h2 className="font-display text-[26px] font-extrabold tracking-tight text-indigo-brand">Our mission</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-[#4a4463]">
            To make professional cleaning effortless and trustworthy for every Gauteng home and business, while creating
            dignified, fairly-paid work for the cleaners who make it happen.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-9">
        <div className="mb-9 text-center">
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-[.12em] text-magenta-brand">What we stand for</div>
          <h2 className="font-display text-[32px] font-extrabold tracking-tight">Values that guide every clean</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-[18px] border border-line bg-white p-5 shadow-card">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[13px] bg-[#f3ecfa] text-magenta-brand"><v.icon size={22} strokeWidth={2.2} /></div>
              <div className="font-display text-[16px] font-bold">{v.title}</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vetting / trust */}
      <section className="bg-[#faf7fc] px-6 py-16 md:px-9">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[13px] font-extrabold uppercase tracking-[.12em] text-magenta-brand">Safety &amp; vetting</div>
            <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">How we keep you safe</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[#4a4463]">
              Letting someone into your home is a matter of trust. That is why no cleaner joins Household Maids without
              passing every step of our vetting process, and why we stand behind every job with insurance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {VETTING.map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-[14px] border border-line bg-white px-4 py-3.5">
                <BadgeCheck size={18} strokeWidth={2.2} className="flex-shrink-0 text-money" />
                <span className="text-[13.5px] font-semibold text-ink">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-9">
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-[13px] font-extrabold uppercase tracking-[.12em] text-magenta-brand">
            <MapPin size={15} strokeWidth={2.4} /> Where we clean
          </div>
          <h2 className="font-display text-[32px] font-extrabold tracking-tight">Serving {areas.length} areas across Gauteng</h2>
        </div>
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2.5">
          {areas.map((a) => (
            <span key={a.id} className="rounded-full border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-[#5f5878]">{a.name}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 md:px-9">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-hero-gradient px-8 py-12 text-center text-white">
          <h2 className="font-display text-[30px] font-extrabold tracking-tight">Ready for a spotless space?</h2>
          <p className="mx-auto mt-2 max-w-md text-[15.5px] text-white/80">Book a vetted cleaner in under a minute, or join our team and start earning.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="rounded-2xl bg-orange-brand px-7 py-4 font-display text-base font-extrabold text-[#2A1A40]">Book a service</Link>
            <Link href="/helper" className="rounded-2xl border-[1.5px] border-white/45 bg-white/10 px-6 py-4 font-display text-base font-bold text-white">Become a helper</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[13px] font-semibold text-white/85">
            <span className="flex items-center gap-1.5"><Clock size={15} strokeWidth={2.2} /> Mon to Fri, 08:00 to 16:00</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} strokeWidth={2.2} /> Vetted &amp; insured</span>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
