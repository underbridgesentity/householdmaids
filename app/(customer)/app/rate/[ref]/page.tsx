import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { RateForm } from "@/components/app/RateForm";

export const dynamic = "force-dynamic";

export default async function RatePage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;
  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: { helper: { include: { user: true } }, review: true },
  });
  if (!booking || booking.customerId !== user.id || !booking.helper) notFound();
  if (booking.review) redirect(`/app/bookings/${booking.reference}`);

  return (
    <AppShell tabs={false} narrow>
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-2">
        <Link href={`/app/bookings/${booking.reference}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-lav text-lg text-indigo-brand">‹</Link>
        <div className="font-display text-xl font-extrabold">Rate your clean</div>
      </div>
      <RateForm bookingId={booking.id} helperName={booking.helper.user.fullName} />
    </AppShell>
  );
}
