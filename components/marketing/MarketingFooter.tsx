import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/** Shared site footer for the public marketing surfaces. */
export function MarketingFooter() {
  return (
    <footer className="bg-ink px-6 py-10 text-white md:px-9">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6">
        <div className="max-w-xs">
          <Logo variant="white" height={32} />
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-white/60">
            Trusted home &amp; commercial cleaning across Gauteng and Mpumalanga. Book in a minute, earn on every referral.
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
              <span>Mon to Fri, 08:00 to 16:00</span>
            </div>
          </div>
          <div>
            <div className="mb-3 font-display text-[13px] font-bold">Explore</div>
            <div className="flex flex-col gap-2 text-[13px] text-white/65">
              <Link href="/about">About us</Link>
              <Link href="/#services">Our services</Link>
              <Link href="/#refer">Refer &amp; earn</Link>
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
  );
}
