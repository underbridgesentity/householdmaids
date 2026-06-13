import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata = { title: "Reset password · Household Maids" };

export default function ForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center"><Link href="/" aria-label="Household Maids home"><Logo height={48} /></Link></div>
        <div className="card p-7 shadow-card">
          <h2 className="font-display text-[24px] font-extrabold tracking-tight">Forgot your password?</h2>
          <p className="mb-6 mt-1 text-sm text-muted-soft">Enter your email and we&apos;ll send you a link to reset it.</p>
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
