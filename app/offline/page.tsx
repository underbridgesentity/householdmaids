import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Offline · Household Maids" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 text-center">
      <Logo height={36} />
      <h1 className="mt-6 font-display text-2xl font-extrabold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-soft">
        We couldn&apos;t reach the internet. Check your connection and try again.
      </p>
      <Link href="/" className="btn-primary mt-6 px-6">Try again</Link>
    </div>
  );
}
