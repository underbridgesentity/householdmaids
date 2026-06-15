import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { SignupForm } from "@/components/auth/SignupForm";
import { getSessionUser, homeFor } from "@/lib/rbac";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));
  const { ref } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-brand via-purple-mid to-magenta-brand p-12 text-white lg:flex">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/[.07]" />
        <Link href="/" aria-label="Household Maids home" className="relative z-10 [filter:drop-shadow(0_2px_10px_rgba(0,0,0,.28))]">
          <Logo variant="white" height={42} />
        </Link>
        <div className="relative z-10">
          <h1 className="font-display text-4xl font-extrabold leading-tight">A sparkling home,<br />a click away.</h1>
          <p className="mt-4 max-w-sm text-white/80">
            Book trusted, vetted cleaners across Gauteng, and earn real cash every time you refer a friend.
          </p>
        </div>
        <Link href="/helper" className="relative z-10 text-sm text-white/75 underline">Want to clean with us? Become a helper</Link>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-surface px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" aria-label="Household Maids home" className="lg:hidden"><Logo height={36} /></Link>
            <Link href="/" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-magenta-brand">← Back to home</Link>
          </div>
          <h2 className="font-display text-[27px] font-extrabold tracking-tight">Create your account</h2>
          <p className="mb-6 mt-1 text-sm text-muted-soft">Book cleans, earn referral cash, all in one place.</p>
          <SignupForm presetCode={ref} />
        </div>
      </div>
    </div>
  );
}
