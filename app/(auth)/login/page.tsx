import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionUser, homeFor } from "@/lib/rbac";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center"><Link href="/" aria-label="Household Maids home"><Logo height={52} /></Link></div>
        <div className="card p-7 shadow-card">
          <h2 className="font-display text-[26px] font-extrabold tracking-tight">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-muted-soft">Sign in to book cleans and manage your wallet.</p>
          <LoginForm />
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white/70 p-4 text-center text-xs text-muted-soft">
          <span className="font-bold text-indigo-brand">Demo logins</span> · customer thandi@email.co.za · helper
          lindiwe@email.co.za · admin admin@householdmaids.co.za · password <span className="font-mono">Password123!</span>
        </div>
      </div>
    </div>
  );
}
