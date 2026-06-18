"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { appendLedger } from "@/lib/wallet";
import { advanceBooking } from "@/lib/booking";
import { notifyUser } from "@/lib/notify";
import { sendHelperAssignedEmail, sendRefundEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

const assignSchema = z.object({ reference: z.string().min(1), helperId: z.string().min(1) });

/** Admin manually assigns or reassigns a vetted helper to a booking. */
export async function adminAssignHelperAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/bookings`);
  const { reference, helperId } = parsed.data;

  const [booking, helper] = await Promise.all([
    prisma.booking.findUnique({ where: { reference }, include: { customer: { select: { email: true, fullName: true } } } }),
    prisma.helperProfile.findUnique({ where: { id: helperId }, include: { user: { select: { fullName: true } } } }),
  ]);
  if (!booking) redirect("/admin/bookings");
  if (!helper || helper.status !== "APPROVED") redirect(`/admin/bookings/${reference}?msg=badhelper`);
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") redirect(`/admin/bookings/${reference}?msg=closed`);

  const reassigning = !!booking.helperId && booking.helperId !== helperId;
  await prisma.booking.update({
    where: { id: booking.id },
    // Assigning a cleaner to a still-CONFIRMED booking moves it forward; a
    // reassignment on a later status keeps that status.
    data: { helperId, ...(booking.status === "CONFIRMED" ? { status: "HELPER_ASSIGNED" } : {}) },
  });
  await notifyUser(booking.customerId, reassigning ? "Cleaner updated" : "Cleaner assigned", `${helper.user.fullName} ${reassigning ? "is now" : "has been"} assigned to your booking ${booking.reference}.`);
  try {
    await sendHelperAssignedEmail({ to: booking.customer.email, fullName: booking.customer.fullName, reference: booking.reference, helperName: helper.user.fullName });
  } catch { /* best-effort */ }
  await audit({ actorId: admin.id, action: reassigning ? "booking.reassigned" : "booking.assigned", entity: "Booking", entityId: reference, meta: { helperId } });
  revalidatePath(`/admin/bookings/${reference}`);
  redirect(`/admin/bookings/${reference}?msg=assigned`);
}

/** Admin advances a paid booking to its next lifecycle status. */
export async function adminAdvanceBookingAction(reference: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) redirect("/admin/bookings");
  if (booking.paymentStatus !== "PAID") redirect(`/admin/bookings/${reference}?msg=unpaid`);
  await advanceBooking(reference);
  await audit({ actorId: admin.id, action: "booking.advanced", entity: "Booking", entityId: reference });
  revalidatePath(`/admin/bookings/${reference}`);
  redirect(`/admin/bookings/${reference}?msg=advanced`);
}

/**
 * Admin cancels a booking. A paid booking is refunded in full to the customer's
 * wallet (store credit) and marked REFUNDED — the REFUNDED guard makes a repeat
 * call a no-op, so the refund can never double up. Completed bookings can't be
 * cancelled.
 */
export async function adminCancelRefundAction(reference: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  const booking = await prisma.booking.findUnique({ where: { reference }, include: { customer: { select: { email: true, fullName: true } } } });
  if (!booking) redirect("/admin/bookings");
  if (booking.status === "COMPLETED") redirect(`/admin/bookings/${reference}?msg=completed`);
  if (booking.status === "CANCELLED") redirect(`/admin/bookings/${reference}?msg=already`);

  const refund = booking.paymentStatus === "PAID";
  await prisma.$transaction(async (tx) => {
    // Lock the booking so a concurrent cancel can't both pass the guard above
    // and issue two refunds.
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE reference = ${reference} FOR UPDATE`;
    const b = await tx.booking.findUnique({ where: { reference } });
    if (!b || b.status === "CANCELLED" || b.paymentStatus === "REFUNDED") return;
    await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", ...(refund ? { paymentStatus: "REFUNDED" } : {}) } });
    if (refund) {
      await appendLedger(tx, { userId: b.customerId, type: "ADJUSTMENT", amountCents: b.totalCents, status: "EARNED", ref: `Refund · cancelled booking ${b.reference}` });
    }
  });
  await notifyUser(booking.customerId, "Booking cancelled", refund ? `Your booking ${booking.reference} was cancelled and R${Math.round(booking.totalCents / 100)} refunded to your wallet.` : `Your booking ${booking.reference} was cancelled.`);
  if (refund) {
    try {
      await sendRefundEmail({ to: booking.customer.email, fullName: booking.customer.fullName, reference: booking.reference, amountCents: booking.totalCents });
    } catch { /* best-effort */ }
  }
  await audit({ actorId: admin.id, action: "booking.cancelled.admin", entity: "Booking", entityId: reference, meta: { refundedCents: refund ? booking.totalCents : 0 } });
  revalidatePath(`/admin/bookings/${reference}`);
  redirect(`/admin/bookings/${reference}?msg=cancelled`);
}
