import { prisma } from "@/lib/db";
import { appendLedger } from "@/lib/wallet";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { bookingReference } from "@/lib/reference";
import type { BookingStatus } from "@prisma/client";

export const STATUS_FLOW: BookingStatus[] = [
  "CONFIRMED", "HELPER_ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED",
];
export const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Booking confirmed",
  HELPER_ASSIGNED: "Helper assigned",
  EN_ROUTE: "On the way",
  IN_PROGRESS: "Cleaning in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Advances a booking to the next lifecycle status. On HELPER_ASSIGNED it auto-
 * matches an approved helper in the area; on COMPLETED it bumps the helper's job
 * count and schedules the next occurrence for recurring bookings.
 */
export async function advanceBooking(reference: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) throw new Error("Not found");
  // A booking only progresses (helper assignment, etc.) once it's actually paid.
  if (booking.paymentStatus !== "PAID") return;
  const idx = STATUS_FLOW.indexOf(booking.status);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
  const next = STATUS_FLOW[idx + 1];

  let helperId = booking.helperId;
  if (next === "HELPER_ASSIGNED" && !helperId) {
    const helper = await prisma.helperProfile.findFirst({
      where: { status: "APPROVED", areas: { some: { id: booking.areaId } } },
      orderBy: { rating: "desc" },
    });
    helperId = helper?.id ?? null;
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { status: next, helperId } });

  if (next === "COMPLETED") {
    if (helperId) {
      await prisma.helperProfile.update({ where: { id: helperId }, data: { completedJobs: { increment: 1 } } });
    }
    await scheduleNextRecurrence(reference);
    await notifyUser(booking.customerId, "Clean completed", "Your clean is done — tap to rate your cleaner ⭐");
  }
}

/** Creates the next booking for a recurring schedule once the current completes. */
async function scheduleNextRecurrence(reference: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { reference }, include: { addons: true } });
  if (!booking || booking.recurrence === "ONCE") return;

  const offsetDays = booking.recurrence === "WEEKLY" ? 7 : 14;
  const nextDate = new Date(booking.scheduledAt);
  nextDate.setDate(nextDate.getDate() + offsetDays);

  // Idempotency guard: don't spawn if a later booking in this recurring series
  // already exists (e.g. completion handled twice).
  const alreadyScheduled = await prisma.booking.findFirst({
    where: {
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      recurrence: booking.recurrence,
      scheduledAt: { gt: booking.scheduledAt },
      status: { not: "CANCELLED" },
    },
  });
  if (alreadyScheduled) return;

  // The next occurrence starts fresh: no helper assigned yet (re-matched on its
  // own HELPER_ASSIGNED step) and unpaid until the customer pays for it.
  await prisma.booking.create({
    data: {
      reference: bookingReference(),
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      areaId: booking.areaId,
      helperId: null,
      addressText: booking.addressText,
      beds: booking.beds,
      baths: booking.baths,
      hours: booking.hours,
      recurrence: booking.recurrence,
      scheduledAt: nextDate,
      status: "CONFIRMED",
      paymentStatus: "PENDING",
      isFirstBooking: false,
      totalCents: booking.totalCents,
      priceSnapshot: booking.priceSnapshot as object,
      addons: { create: booking.addons.map((a) => ({ addonId: a.addonId, priceCents: a.priceCents })) },
      payment: { create: { amountCents: booking.totalCents } },
    },
  });
}

/**
 * Marks a booking paid and runs fulfilment. Idempotent on the booking's payment
 * status — safe to call from the Payfast ITN webhook (which may retry) and from
 * the dev simulation. This is the ONLY place a referral reward is earned: a
 * referral is verified by payment, never by signup.
 */
export async function markBookingPaid(reference: string, providerRef?: string): Promise<void> {
  const settings = await getSettings();

  await prisma.$transaction(async (tx) => {
    // Lock the booking row first so concurrent ITN deliveries (Payfast retries
    // aggressively) serialize here. Without the lock both could read
    // paymentStatus != "PAID" under READ COMMITTED and double-credit the
    // referral reward.
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE reference = ${reference} FOR UPDATE`;
    const booking = await tx.booking.findUnique({
      where: { reference },
      include: { payment: true, referral: true },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.paymentStatus === "PAID") return; // already fulfilled

    await tx.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "PAID" },
    });
    await tx.paymentTransaction.update({
      where: { bookingId: booking.id },
      data: { status: "PAID", providerRef: providerRef ?? booking.payment?.providerRef },
    });

    // Earn the referral reward, but only for the referee's FIRST paid booking.
    if (booking.referral && booking.referral.status === "PENDING" && booking.isFirstBooking) {
      await tx.referral.update({
        where: { id: booking.referral.id },
        data: {
          status: "EARNED",
          rewardCents: settings.referrerRewardCents,
          bookingId: booking.id,
          earnedAt: new Date(),
        },
      });
      await appendLedger(tx, {
        userId: booking.referral.referrerId,
        type: "REFERRAL_REWARD",
        amountCents: settings.referrerRewardCents,
        status: "EARNED",
        ref: `Referral · booking ${booking.reference}`,
      });
    }
  });

  // Side effects outside the money transaction.
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: { referral: true, customer: true },
  });
  if (booking) {
    await notifyUser(booking.customerId, "Booking confirmed", `Your booking ${booking.reference} is confirmed and paid.`);
    if (booking.referral?.status === "EARNED") {
      await notifyUser(
        booking.referral.referrerId,
        "You earned a referral reward!",
        `${booking.customer.fullName} completed their first booking — your reward is now in your wallet.`,
      );
    }
    await audit({ action: "booking.paid", entity: "Booking", entityId: booking.id, meta: { reference, providerRef } });
  }

  // Now that it's paid, match a vetted helper (CONFIRMED -> HELPER_ASSIGNED).
  // Without this the booking would sit at "matching a cleaner" forever, since
  // helpers only see jobs already assigned to them. Best-effort: a matching
  // failure must not fail the payment confirmation.
  try {
    await assignHelper(reference);
  } catch {
    /* helper can be assigned later by an admin / retry */
  }
}

/**
 * Assigns the best-rated approved helper in the booking's area to a paid,
 * still-unassigned booking and moves it to HELPER_ASSIGNED. No-op if the booking
 * isn't paid/confirmed, already has a helper, or no helper serves the area yet.
 */
export async function assignHelper(reference: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking || booking.paymentStatus !== "PAID" || booking.status !== "CONFIRMED" || booking.helperId) return;
  const helper = await prisma.helperProfile.findFirst({
    where: { status: "APPROVED", areas: { some: { id: booking.areaId } } },
    orderBy: { rating: "desc" },
  });
  if (!helper) return; // no helper serves this area yet; leave CONFIRMED for later
  await prisma.booking.update({ where: { id: booking.id }, data: { status: "HELPER_ASSIGNED", helperId: helper.id } });
  await notifyUser(booking.customerId, "Cleaner assigned", "A vetted cleaner has been assigned to your booking.");
}
