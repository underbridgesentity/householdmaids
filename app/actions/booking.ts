"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { bookingSchema, reviewSchema, messageSchema } from "@/lib/validation";
import { computePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { bookingReference } from "@/lib/reference";
import { markBookingPaid, advanceBooking } from "@/lib/booking";
import { audit } from "@/lib/audit";

export async function advanceStatusAction(reference: string): Promise<void> {
  // The booking's customer (demo control) or its assigned helper may advance it.
  const user = await assertRole("CUSTOMER", "HELPER");
  const booking = await prisma.booking.findUnique({ where: { reference }, include: { helper: true } });
  if (!booking) throw new Error("Not found");
  const allowed = booking.customerId === user.id || booking.helper?.userId === user.id;
  if (!allowed) throw new Error("Not allowed");
  await advanceBooking(reference);
  revalidatePath(`/app/bookings/${reference}`);
  revalidatePath(`/helper/jobs/${reference}`);
}

/**
 * Creates a booking. The server is the single source of truth for price —
 * it recomputes the total from trusted DB rates and ignores any client total.
 */
export async function createBookingAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER");

  const raw = {
    ...Object.fromEntries(formData),
    addonIds: formData.getAll("addonIds").map(String),
  };
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid booking details");
  const input = parsed.data;

  const [service, addons, area, settings, priorBookings, pendingReferral] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.addon.findMany({ where: { id: { in: input.addonIds }, active: true } }),
    prisma.area.findUnique({ where: { id: input.areaId } }),
    getSettings(),
    prisma.booking.count({ where: { customerId: user.id } }),
    prisma.referral.findUnique({ where: { refereeId: user.id } }),
  ]);
  if (!service || !service.active) throw new Error("Service unavailable");
  if (!area) throw new Error("Invalid area");

  const isFirstBooking = priorBookings === 0;
  // Referral discount only on a genuine first booking with a pending referral.
  const applyReferral =
    input.applyReferral && isFirstBooking && !!pendingReferral && pendingReferral.status === "PENDING";

  const breakdown = computePrice({
    service,
    beds: input.beds,
    baths: input.baths,
    hours: input.hours,
    addonCents: addons.map((a) => a.price),
    recurrence: input.recurrence,
    applyReferralDiscount: applyReferral,
    settings,
  });

  const reference = bookingReference();
  await prisma.booking.create({
    data: {
      reference,
      customerId: user.id,
      serviceId: service.id,
      areaId: area.id,
      addressText: input.addressText,
      beds: service.mode === "ROOMS" ? input.beds : 0,
      baths: service.mode === "ROOMS" ? input.baths : 0,
      hours: service.mode === "HOURS" ? Math.max(input.hours, service.minHours) : 0,
      recurrence: input.recurrence,
      scheduledAt: input.scheduledAt,
      status: "CONFIRMED",
      paymentStatus: "PENDING",
      isFirstBooking,
      totalCents: breakdown.totalCents,
      priceSnapshot: breakdown as unknown as Prisma.InputJsonValue,
      addons: { create: addons.map((a) => ({ addonId: a.id, priceCents: a.price })) },
      payment: { create: { amountCents: breakdown.totalCents } },
      ...(applyReferral && pendingReferral
        ? { referral: { connect: { id: pendingReferral.id } } }
        : {}),
    },
  });

  await audit({ actorId: user.id, action: "booking.created", entity: "Booking", entityId: reference, meta: { totalCents: breakdown.totalCents } });
  redirect(`/app/pay/${reference}`);
}

/** Dev-only: simulate a successful Payfast payment (no public ITN reachable on localhost). */
export async function simulatePaymentAction(reference: string): Promise<void> {
  if (process.env.NODE_ENV === "production") throw new Error("Disabled in production");
  const user = await assertRole("CUSTOMER");
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking || booking.customerId !== user.id) throw new Error("Not found");
  await markBookingPaid(reference, "SIMULATED-" + reference);
  redirect(`/app/bookings/${reference}?paid=1`);
}

export async function submitReviewAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER");
  const parsed = reviewSchema.safeParse({
    ...Object.fromEntries(formData),
    tags: formData.getAll("tags").map(String),
  });
  if (!parsed.success) throw new Error("Invalid review");
  const { bookingId, stars, note, tags } = parsed.data;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { review: true } });
  if (!booking || booking.customerId !== user.id || !booking.helperId) throw new Error("Not allowed");
  if (booking.review) redirect("/app");

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: { bookingId, customerId: user.id, helperId: booking.helperId!, stars, note: note || null, tags },
    });
    // Recompute helper rating average.
    const agg = await tx.review.aggregate({ where: { helperId: booking.helperId! }, _avg: { stars: true } });
    await tx.helperProfile.update({ where: { id: booking.helperId! }, data: { rating: agg._avg.stars ?? stars } });
  });
  redirect(`/app/bookings/${booking.reference}`);
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid message");

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { conversation: true, helper: true },
  });
  if (!booking) throw new Error("Not found");
  // Only the booking's customer or assigned helper may post.
  const isParty = booking.customerId === user.id || booking.helper?.userId === user.id;
  if (!isParty) throw new Error("Not allowed");

  const convo =
    booking.conversation ??
    (await prisma.conversation.create({ data: { bookingId: booking.id } }));
  await prisma.message.create({
    data: { conversationId: convo.id, senderId: user.id, body: parsed.data.body },
  });
  // Refresh whichever chat surface the sender is on (customer or helper).
  revalidatePath(`/app/messages/${booking.reference}`);
  revalidatePath(`/helper/jobs/${booking.reference}/chat`);
}
