import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/crypto";
import { unsubscribeAction } from "@/app/actions/unsubscribe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe · Household Maids", robots: { index: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const userId = verifyToken(token);
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, marketingOptOut: true } }) : null;

  const unsubscribed = done === "1" || user?.marketingOptOut;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-hero-gradient px-5 py-12">
      <div className="w-full max-w-md rounded-[22px] border border-white/10 bg-white p-7 text-center shadow-[0_40px_80px_-30px_rgba(40,25,80,.6)]">
        {!user ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-lav text-2xl">🔗</div>
            <h1 className="font-display text-xl font-extrabold text-ink">Link not valid</h1>
            <p className="mt-2 text-[14px] text-muted">This unsubscribe link is invalid or has expired. You can manage email preferences from your account instead.</p>
          </>
        ) : unsubscribed ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6f6ed] text-2xl">✓</div>
            <h1 className="font-display text-xl font-extrabold text-ink">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-[14px] text-muted">{user.email} won&apos;t receive marketing emails from Household Maids anymore. You&apos;ll still get essential emails about your bookings and payments.</p>
            <Link href="/" className="mt-5 inline-block rounded-[12px] bg-brand-gradient px-5 py-2.5 text-[13.5px] font-bold text-white">Back to Household Maids</Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-pink text-2xl">✉️</div>
            <h1 className="font-display text-xl font-extrabold text-ink">Unsubscribe from marketing emails?</h1>
            <p className="mt-2 text-[14px] text-muted">{user.email} will stop receiving newsletters and offers. You&apos;ll still get essential emails about your bookings and payments.</p>
            <form action={unsubscribeAction} className="mt-5">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="w-full rounded-[12px] bg-brand-gradient px-5 py-3 text-[14px] font-bold text-white">Yes, unsubscribe me</button>
            </form>
            <Link href="/" className="mt-3 inline-block text-[13px] font-semibold text-muted">No, keep me subscribed</Link>
          </>
        )}
      </div>
    </main>
  );
}
