import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Star, Lock, Target, Leaf, Phone, Mail, Clock, MapPin, Gift } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fromPriceCents } from "@/lib/pricing";
import { formatZar } from "@/lib/money";
import { servicePhoto } from "@/lib/service-photos";
import { Logo } from "@/components/ui/Logo";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [services, areas, settings] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  const reward = formatZar(settings.referrerRewardCents);
  const discount = formatZar(settings.firstBookingDiscountCents);

  return (
    <div className="bg-white text-ink">
      {/* Nav, floating glass pill with a mobile hamburger menu */}
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute -left-20 -top-28 h-80 w-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute left-[42%] top-7 text-2xl text-orange-brand">✦</div>
        <div className="pointer-events-none absolute left-[47%] top-20 text-base text-white">✦</div>
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-6 py-14 md:grid-cols-2 md:px-9">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-brand" />
              <span className="text-[12.5px] font-bold tracking-wide text-white">NOW LAUNCHING IN GAUTENG</span>
            </div>
            <h1 className="font-display text-[clamp(34px,4.6vw,54px)] font-extrabold leading-[1.04] tracking-tight text-white">
              For all your<br />cleaning needs - <br />
              <span className="text-orange-brand">rewarded.</span>
            </h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/80">
              Book trusted, vetted cleaners across Gauteng in under a minute, then earn {reward} every time a friend
              books with your referral link.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/book" className="rounded-2xl bg-orange-brand px-7 py-4 font-display text-base font-extrabold text-[#2A1A40] shadow-[0_18px_32px_-14px_rgba(242,150,14,.55)]">
                Book a service
              </Link>
              <a href="#refer" className="rounded-2xl border-[1.5px] border-white/45 bg-white/10 px-6 py-4 font-display text-base font-bold text-white">
                Refer &amp; earn {reward}
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-[13.5px] font-semibold text-white/90">
              <span className="flex items-center gap-1.5"><ShieldCheck size={16} strokeWidth={2.2} /> Vetted &amp; insured</span>
              <span className="flex items-center gap-1.5"><Star size={16} strokeWidth={2.2} /> 4.9 rating</span>
              <span className="flex items-center gap-1.5"><Lock size={16} strokeWidth={2.2} /> Secure payments</span>
            </div>
            {/* Mobile hero image (desktop uses the framed column on the right) */}
            <div className="relative mt-7 h-56 w-full overflow-hidden rounded-3xl shadow-2xl md:hidden">
              <Image src="/photos/hero.jpg" alt="A friendly Household Maids cleaner" fill sizes="100vw" className="object-cover" priority />
            </div>
          </div>
          <div className="relative hidden min-h-[440px] md:block">
            <div className="absolute right-2.5 top-20 h-[150px] w-[88px] rounded-l-none rounded-r-[90px] bg-orange-brand opacity-90" />
            <div className="absolute right-12 top-20 h-[150px] w-[88px] rounded-r-[90px] bg-orange-brand opacity-50" />
            <div className="relative z-10 mx-auto mt-6 h-[400px] w-[330px] max-w-full overflow-hidden rounded-[180px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.5)]">
              <Image src="/photos/hero.jpg" alt="A friendly Household Maids cleaner" fill priority sizes="(max-width: 1024px) 50vw, 460px" quality={90} className="object-cover" />
            </div>
            <div className="glass absolute bottom-3.5 left-0 z-20 flex items-center gap-3 rounded-2xl px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdf0dc] text-orange-deep"><Gift size={20} strokeWidth={2.2} /></div>
              <div>
                <div className="font-display text-[15px] font-extrabold text-orange-deep">{reward} per referral</div>
                <div className="text-[11.5px] text-muted">Earn when a friend books</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats, honest, launch-appropriate facts */}
      <section className="grid grid-cols-2 gap-px border-y border-line bg-line md:grid-cols-4">
        {[[`${areas.length}`, "Gauteng areas"], ["100%", "Vetted & insured"], [reward, "Per referral"], ["Fri", "Weekly payouts"]].map(
          ([n, l], i) => (
            <div key={l} className="bg-white px-6 py-6 text-center">
              <div className={`font-display text-[28px] font-extrabold ${i === 2 ? "text-magenta-brand" : "text-indigo-brand"}`}>{n}</div>
              <div className="text-[13px] text-muted">{l}</div>
            </div>
          ),
        )}
      </section>

      {/* Services */}
      <section id="services" className="px-6 py-14 md:px-9">
        <div className="mb-8 text-center">
          <div className="mb-2 text-[13px] font-extrabold uppercase tracking-[.12em] text-magenta-brand">Our services</div>
          <h2 className="font-display text-[34px] font-extrabold tracking-tight">Cleaning for every corner</h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
              <div className="relative h-40 w-full">
                <Image src={servicePhoto(s.name)} alt={s.name} fill sizes="(max-width:640px) 100vw, 380px" className="object-cover" />
                <div className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-[13px] text-2xl shadow-md" style={{ background: s.tint }}>{s.emoji}</div>
              </div>
              <div className="p-5">
                <div className="font-display text-lg font-bold">{s.name}</div>
                <div className="my-1.5 text-[13.5px] leading-relaxed text-muted">{s.description}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-[15px] font-bold text-magenta-brand">from {formatZar(fromPriceCents(s, settings))}</span>
                  <Link href={`/book?service=${s.id}`} className="text-[13.5px] font-bold text-indigo-brand">Book ›</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#faf7fc] px-6 py-14 md:px-9">
        <h2 className="mb-9 text-center font-display text-[34px] font-extrabold tracking-tight">Booked in three taps</h2>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            ["1", "Choose your clean", "Pick a service, size and add-ons, then a time that suits you."],
            ["2", "We match a pro", "A vetted, insured cleaner near you is assigned and confirmed."],
            ["3", "Relax & rate", "Track live, chat with your cleaner, pay securely and rate the job."],
          ].map(([n, t, d]) => (
            <div key={n} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient font-display text-2xl font-extrabold text-white">{n}</div>
              <div className="mb-1.5 font-display text-lg font-bold">{t}</div>
              <div className="text-sm leading-relaxed text-muted-soft">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Referral band */}
      <section id="refer" className="relative mx-6 my-14 overflow-hidden rounded-[26px] bg-gradient-to-br from-magenta-brand to-indigo-brand px-8 py-12 md:mx-9">
        <div className="pointer-events-none absolute -right-8 -top-10 text-[220px] opacity-10">💸</div>
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-3 font-display text-[32px] font-extrabold tracking-tight text-white">Turn your network into income.</h2>
            <p className="mb-6 max-w-md text-base leading-relaxed text-white/85">
              Share your link. When a friend&apos;s first booking is paid, you earn {reward}, and they get {discount} off.
              No cap on how much you make.
            </p>
            <Link href="/signup" className="rounded-xl bg-white px-7 py-3.5 font-display font-bold text-indigo-brand">Get your referral link</Link>
          </div>
          {/* Illustrative explainer, how the reward works (not a real user's earnings) */}
          <div className="glass-dark rounded-[20px] p-6">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="font-display text-[40px] font-extrabold text-white">{reward}</span>
              <span className="text-[15px] font-semibold text-white/80">per friend · no cap</span>
            </div>
            <div className="mb-5 text-[13px] text-white/70">Paid out every Friday, no minimum, no fees.</div>
            <div className="flex flex-col gap-3">
              {[
                ["1", "Share your link", "Send your personal link to friends & family."],
                ["2", "They book a clean", `New customers get ${discount} off their first clean.`],
                ["3", `You earn ${reward}`, "Straight to your wallet once they pay."],
              ].map(([n, t, d]) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/20 font-display text-[13px] font-bold text-white">{n}</div>
                  <div>
                    <div className="font-display text-sm font-bold text-white">{t}</div>
                    <div className="text-[12.5px] leading-snug text-white/70">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="px-6 pb-14 pt-6 md:px-9">
        <h2 className="mb-8 text-center font-display text-[32px] font-extrabold tracking-tight text-indigo-brand">Why choose us?</h2>
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            [ShieldCheck, "Trusted professionals", "Every cleaner is ID-verified with references and a police clearance before they join."],
            [Target, "Tailored solutions", "We customise cleaning plans to fit your schedule, preferences and budget."],
            [Leaf, "Eco-friendly practices", "We prioritise sustainability, using environmentally friendly products wherever possible."],
            [Star, "Satisfaction guaranteed", "We strive for perfection on every clean, your satisfaction is our priority."],
          ] as const).map(([Icon, t, d]) => (
            <div key={t} className="rounded-2xl border border-line p-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0dc] text-orange-accent">
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <div className="mb-1.5 font-display text-base font-extrabold text-orange-accent">{t}</div>
              <div className="text-[13.5px] leading-relaxed text-muted-soft">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Helper band */}
      <section className="bg-[#faf7fc] px-6 py-12 md:px-9">
        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-2">
          <div className="relative order-2 h-64 w-full overflow-hidden rounded-3xl shadow-card md:order-1 md:h-80">
            <Image src="/photos/helper.jpg" alt="A Household Maids cleaner celebrating" fill sizes="(max-width:768px) 100vw, 480px" className="object-cover" />
          </div>
          <div className="order-1 text-center md:order-2 md:text-left">
            <div className="mb-3 text-[34px]">🧽</div>
            <h2 className="mb-2.5 font-display text-[30px] font-extrabold tracking-tight">Earn a steady income as a cleaner</h2>
            <p className="mb-5 max-w-xl text-base leading-relaxed text-[#5f5878]">
              Join our vetted team across Gauteng. Choose your areas, set your schedule, and get paid every Friday.
            </p>
            <Link href="/helper" className="inline-block rounded-xl bg-brand-gradient px-7 py-3.5 font-display font-bold text-white">Apply to become a helper</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-14 md:px-9">
        <h2 className="mb-8 text-center font-display text-[32px] font-extrabold tracking-tight">Loved across Gauteng</h2>
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["“Booking took a minute and the clean was immaculate. I’ve already earned from referring friends.”", "Refilwe M.", "Sandton", "R", "#efe5f6", "#4A2C7C"],
            ["“My cleaner is reliable and friendly. The recurring discount makes it so easy to keep the place spotless.”", "Naledi K.", "Centurion", "N", "#fbe9f5", "#A22D8F"],
            ["“As a helper I love the weekly payouts and choosing my own areas. Best platform I’ve worked with.”", "Sipho M.", "Cleaner · Midrand", "S", "#e8e8fb", "#4A56C7"],
          ].map(([quote, name, place, initial, bg, col]) => (
            <div key={name} className="rounded-[18px] border border-line bg-white p-5">
              <div className="mb-2.5 text-base text-[#E8A33D]">★★★★★</div>
              <p className="mb-4 text-[14.5px] leading-relaxed text-[#4a4463]">{quote}</p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full font-display font-bold" style={{ background: bg, color: col }}>{initial}</div>
                <div>
                  <div className="text-[13.5px] font-bold">{name}</div>
                  <div className="text-xs text-muted-faint">{place}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Areas */}
      <section className="px-6 pb-14 text-center md:px-9">
        <h3 className="mb-4 font-display text-xl font-bold">Now serving across Gauteng</h3>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2.5">
          {areas.map((a) => (
            <span key={a.id} className="rounded-full bg-surface-lav px-4 py-2 text-[13.5px] font-semibold text-indigo-brand">{a.name}</span>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-[#faf7fc] px-6 py-14 md:px-9">
        <div className="mb-7 text-center">
          <h2 className="mb-2 font-display text-[32px] font-extrabold tracking-tight text-indigo-brand">Get in touch</h2>
          <p className="text-[15px] text-muted-soft">We&apos;d love to help with your next clean.</p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            [Phone, "PHONE", "062 032 4931"],
            [Mail, "EMAIL", "info@householdmaids.co.za"],
            [Clock, "HOURS", "Mon–Fri 08:00–16:00 · Weekends closed"],
            [MapPin, "VISIT (KEMPTON PARK)", "70 Commissioner Rd, Office 7, Monument Corner Office Park"],
          ] as const).map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-white p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[13px] bg-[#fdf0dc] text-orange-accent"><Icon size={22} strokeWidth={2.2} /></div>
              <div className="mb-1 font-display text-[13px] font-bold text-orange-accent">{label}</div>
              <div className="text-[13.5px] font-semibold text-ink">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink px-6 py-10 text-white md:px-9">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6">
          <div className="max-w-xs">
            <Logo variant="white" height={32} />
            <p className="mt-3.5 text-[13.5px] leading-relaxed text-white/60">
              Trusted home &amp; commercial cleaning across Gauteng. Book in a minute, earn on every referral.
            </p>
          </div>
          <div className="flex flex-wrap gap-14">
            <div>
              <div className="mb-3 font-display text-[13px] font-bold">Visit us</div>
              <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-white/65">
                <span>Office 2D, Nedbank Centre,<br />6A OR Tambo, Middelburg, 1050</span>
                <span>70 Commissioner Rd, Office 7,<br />Monument Corner, Kempton Park</span>
              </div>
            </div>
            <div>
              <div className="mb-3 font-display text-[13px] font-bold">Contact</div>
              <div className="flex flex-col gap-2 text-[13px] text-white/65">
                <span>062 032 4931</span>
                <span>info@householdmaids.co.za</span>
                <span>Mon–Fri 08:00–16:00</span>
              </div>
            </div>
            <div>
              <div className="mb-3 font-display text-[13px] font-bold">Explore</div>
              <div className="flex flex-col gap-2 text-[13px] text-white/65">
                <a href="#services">Our services</a>
                <a href="#refer">Refer &amp; earn</a>
                <Link href="/helper">Become a helper</Link>
                <Link href="/login">Sign in</Link>
                <Link href="/terms">Terms of Service</Link>
                <Link href="/privacy">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-7 border-t border-white/10 pt-4 text-[12.5px] text-white/50">
          © 2026 Household Maids &amp; Cleaning Services · Operated by Mukhoni Cleaning Specialists (Pty) Ltd
        </div>
      </footer>
    </div>
  );
}
