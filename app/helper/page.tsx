import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Become a helper · Household Maids" };

const features = [
  { emoji: "💰", title: "Weekly payouts every Friday", sub: "Reliable income, straight to your bank" },
  { emoji: "📍", title: "Work in areas near you", sub: "Pick the suburbs that suit you" },
  { emoji: "🛡️", title: "Insured, supported jobs", sub: "We have your back on every clean" },
];

export default function HelperIntroPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-hero-gradient text-white">
      <header className="flex items-center justify-between px-5 py-4 md:px-9">
        <Link href="/" aria-label="Household Maids home"><Logo variant="white" height={30} /></Link>
        <Link href="/login" className="text-sm font-semibold text-white/85 hover:text-white">Sign in</Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-stretch gap-8 px-6 py-8 md:px-9 lg:flex-row lg:items-center lg:gap-14 lg:py-12">
        {/* Image */}
        <div className="relative order-1 h-56 w-full overflow-hidden rounded-3xl shadow-2xl sm:h-72 lg:order-2 lg:h-[440px] lg:flex-1">
          <Image src="/photos/helper.jpg" alt="A happy Household Maids cleaner" fill sizes="(max-width:1024px) 100vw, 520px" className="object-cover" priority />
        </div>

        {/* Copy */}
        <div className="order-2 flex flex-col lg:order-1 lg:flex-1">
          <div className="mb-4 text-[54px] leading-none">🧽</div>
          <h1 className="font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.08] tracking-tight">
            Earn a steady income with Household Maids
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80 md:text-base">
            Join our vetted team of cleaners across Gauteng. Flexible work, fair pay, and the support you deserve.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3.5 rounded-[16px] border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] bg-white/15 text-[22px]">{f.emoji}</div>
                <div>
                  <div className="font-display text-[14.5px] font-bold">{f.title}</div>
                  <div className="text-[12px] text-white/70">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-start gap-3">
            <Link href="/helper/apply" className="w-full rounded-[15px] bg-white py-3.5 text-center font-display text-[15px] font-extrabold text-indigo-brand sm:w-auto sm:px-10">
              Start application
            </Link>
            <div className="text-[12.5px] text-white/70">
              Already a helper? <Link href="/login" className="font-bold text-white underline">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
