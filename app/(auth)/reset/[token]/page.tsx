import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata = { title: "Set a new password · Household Maids" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center"><Link href="/" aria-label="Household Maids home"><Logo height={40} /></Link></div>
        <div className="card p-7 shadow-card">
          <h2 className="font-display text-[24px] font-extrabold tracking-tight">Set a new password</h2>
          <p className="mb-6 mt-1 text-sm text-muted-soft">Choose a new password for your account.</p>
          <ResetForm token={token} />
        </div>
      </div>
    </div>
  );
}
