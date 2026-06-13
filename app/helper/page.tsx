import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app/AppShell";

export default function HelperIntroPage() {
  const features = [
    { emoji: "💰", title: "Weekly payouts every Friday", sub: "Reliable income, straight to your bank" },
    { emoji: "📍", title: "Work in areas near you", sub: "Pick the suburbs that suit you" },
    { emoji: "🛡️", title: "Insured, supported jobs", sub: "We have your back on every clean" },
  ];

  return (
    <AppShell tabs={false}>
      <div className="flex min-h-screen flex-col bg-brand-gradient-160 text-white md:min-h-0 md:h-full">
        <div className="px-[18px] pt-4">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg text-white">‹</Link>
        </div>

        <div className="flex flex-1 flex-col px-[18px] pb-[18px] pt-6">
          <div className="relative h-44 w-full overflow-hidden rounded-3xl shadow-2xl">
            <Image src="/photos/helper.jpg" alt="A happy Household Maids cleaner" fill sizes="100vw" className="object-cover" priority />
          </div>
          <h1 className="mt-5 font-display text-[30px] font-extrabold leading-[1.08] tracking-tight">
            Earn a steady income with Household Maids
          </h1>
          <p className="mt-3.5 max-w-[300px] text-[15px] leading-relaxed text-white/80">
            Join our vetted team of cleaners across Gauteng. Flexible work, fair pay, and the
            support you deserve.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3.5 rounded-[16px] border border-white/15 bg-white/10 p-3.5">
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] bg-white/15 text-[22px]">{f.emoji}</div>
                <div>
                  <div className="font-display text-[14.5px] font-bold">{f.title}</div>
                  <div className="text-[12px] text-white/70">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <Link
              href="/helper/apply"
              className="block w-full rounded-[15px] bg-white py-3.5 text-center font-display text-[15px] font-extrabold text-indigo-brand"
            >
              Start application
            </Link>
            <div className="mt-3 text-center text-[12.5px] text-white/70">
              Already a helper?{" "}
              <Link href="/login" className="font-bold text-white underline">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
