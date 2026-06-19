"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { assertRole, getSessionUser } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/password";
import { bookingSchema, reviewSchema, messageSchema } from "@/lib/validation";
import { computePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { bookingReference, referralCodeFor } from "@/lib/reference";
import { markBookingPaid, advanceBooking, assignHelper } from "@/lib/booking";
import { appendLedger } from "@/lib/wallet";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendWelcomeEmail, sendRefundEmail } from "@/lib/email";
import { logCustomerEmail } from "@/lib/notify";
import { audit } from "@/lib/audit";

export type BookingState = { error?: string } | undefined;

// Account fields collected at the end of a guest booking.
// fullName/password strength are only required when CREATING a new account
// (a returning customer signing in supplies just email + their password).
const guestAccountSchema = z.object({
  fullName: z.string().max(80).optional().or(z.literal("")),
  email: z.string().email().max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
  password: z.string().min(1).max(100),
  referralCode: z.string().max(32).optional().or(z.literal("")),
});

export async function advanceStatusAction(reference: string): Promise<void> {
  // Demo-only control for walking a booking through its statuses. Customers do
  // not drive their own booking status in production (helpers use advanceJobAction),
  // so this is disabled there.
  if (process.env.NODE_ENV === "production") throw new Error("Disabled in production");
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
 * Creates a booking. Works for both signed-in customers AND guests, a guest
 * chooses everything first, then creates an account (or signs in) at the end.
 * The server is the single source of truth for price.
 */
export async function createBookingAction(formData: FormData): Promise<BookingState> {
  const ip = await clientIp();
  if (!(await rateLimit(`booking:${ip}`, 30, 60 * 60 * 1000))) {
    return { error: "Too many booking attempts. Please try again shortly." };
  }

  const session = await getSessionUser();
  const parsed = bookingSchema.safeParse({
    ...Object.fromEntries(formData),
    addonIds: formData.getAll("addonIds").map(String),
  });
  if (!parsed.success) return { error: "Please review your booking details and try again." };
  const input = parsed.data;

  // ---- Resolve the customer (existing session, sign-in, or new account) ----
  let customerId: string;
  let signInCreds: { email: string; password: string } | null = null;

  if (session?.role === "CUSTOMER") {
    customerId = session.id;
  } else {
    const acct = guestAccountSchema.safeParse(Object.fromEntries(formData));
    if (!acct.success) return { error: acct.error.issues[0]?.message ?? "Please complete your details." };
    const { fullName, email, phone, password, referralCode } = acct.data;
    const lower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower } });

    if (existing) {
      // Returning customer finishing checkout, verify their password to sign in.
      if (existing.role !== "CUSTOMER" || !(await verifyPassword(existing.passwordHash, password))) {
        return { error: "That email and password don't match. Check your password, or use 'I'm new' to create an account." };
      }
      customerId = existing.id;
    } else {
      // Creating a brand-new account needs a name and a strong password.
      if (!fullName || fullName.trim().length < 2) return { error: "Please enter your name to create an account." };
      if (password.length < 8) return { error: "Your password must be at least 8 characters." };
      const code = referralCode?.trim().toUpperCase();
      const referrerCode = code
        ? await prisma.referralCode.findUnique({ where: { code } })
        : null;
      const passwordHash = await hashPassword(password);
      const created = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            fullName, email: lower, phone: phone || null, passwordHash, role: "CUSTOMER",
            referralCode: { create: { code: referralCodeFor(fullName) } },
          },
        });
        if (referrerCode && referrerCode.ownerId !== u.id) {
          await tx.referral.create({ data: { codeId: referrerCode.id, referrerId: referrerCode.ownerId, refereeId: u.id, status: "PENDING" } });
        }
        return u;
      });
      customerId = created.id;
      // Welcome email for the just-created guest account (best-effort).
      try {
        await sendWelcomeEmail({ to: lower, fullName });
      } catch {
        /* email delivery is non-critical */
      }
    }
    signInCreds = { email: lower, password };
  }

  // ---- Price (server-authoritative) ----
  const [service, addons, area, settings, priorBookings, pendingReferral] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.addon.findMany({ where: { id: { in: input.addonIds }, active: true } }),
    prisma.area.findUnique({ where: { id: input.areaId } }),
    getSettings(),
    // "First booking" for referral eligibility ignores CANCELLED bookings, so an
    // abandoned-then-cancelled first attempt doesn't burn the discount on a
    // rebook. An active (still-pending) booking DOES count, which prevents
    // stacking the discount across multiple unpaid bookings.
    prisma.booking.count({ where: { customerId, status: { not: "CANCELLED" } } }),
    prisma.referral.findUnique({ where: { refereeId: customerId } }),
  ]);
  if (!service || !service.active) return { error: "That service is no longer available." };
  if (service.quoteOnly) return { error: "This service is quote-only. Please request a quote instead." };
  if (!area) return { error: "Please choose a valid service area." };
  if (service.mode === "EXTRAS" && addons.length === 0) {
    return { error: "Please choose at least one task for an extras-only booking." };
  }

  const isFirstBooking = priorBookings === 0;
  const applyReferral = isFirstBooking && !!pendingReferral && pendingReferral.status === "PENDING";

  const breakdown = computePrice({
    service, beds: input.beds, baths: input.baths, hours: input.hours,
    addonCents: addons.map((a) => a.price), recurrence: input.recurrence,
    applyReferralDiscount: applyReferral, settings,
  });

  const reference = bookingReference();
  await prisma.booking.create({
    data: {
      reference,
      customerId,
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
      ...(applyReferral && pendingReferral ? { referral: { connect: { id: pendingReferral.id } } } : {}),
    },
  });
  await audit({ actorId: customerId, action: "booking.created", entity: "Booking", entityId: reference, meta: { totalCents: breakdown.totalCents, guest: !!signInCreds } });

  // Guests are signed in on the way to payment; signed-in customers just go there.
  if (signInCreds) {
    await signIn("credentials", { ...signInCreds, redirectTo: `/app/pay/${reference}` });
    return undefined; // signIn redirects
  }
  redirect(`/app/pay/${reference}`);
}

/**
 * Customer cancels their own booking. Always allowed while UNPAID (abandoned
 * attempt). A PAID booking can be cancelled only while still unassigned
 * (CONFIRMED) — its amount is then refunded to the customer's wallet. Once a
 * cleaner is assigned or en route, cancellation goes through support.
 */
export async function cancelBookingAction(reference: string): Promise<void> {
  const user = await assertRole("CUSTOMER");
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking || booking.customerId !== user.id) throw new Error("Not found");
  if (booking.status === "CANCELLED") redirect("/app/bookings");

  // A paid booking can be cancelled (and refunded to wallet) up until the cleaner
  // is actually on the way. Once they're EN_ROUTE/in progress, it's support-only.
  const isPaid = booking.paymentStatus === "PAID";
  const refundable = booking.status === "CONFIRMED" || booking.status === "HELPER_ASSIGNED";
  if (isPaid && !refundable) {
    throw new Error("Your cleaner is already on the way. Please contact support to cancel.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    // Refund a paid booking's full amount to the wallet (store credit, not cash).
    if (isPaid) {
      await appendLedger(tx, {
        userId: user.id,
        type: "ADJUSTMENT",
        amountCents: booking.totalCents,
        status: "EARNED",
        ref: `Refund · cancelled booking ${booking.reference}`,
      });
    }
  });
  await audit({ actorId: user.id, action: "booking.cancelled", entity: "Booking", entityId: reference, meta: { refundedCents: isPaid ? booking.totalCents : 0 } });
  if (isPaid && user.email) {
    try {
      await sendRefundEmail({ to: user.email, fullName: user.name ?? "there", reference: booking.reference, amountCents: booking.totalCents });
      await logCustomerEmail(user.id, `Refunded to your wallet · ${booking.reference}`, `Booking cancelled — R${Math.round(booking.totalCents / 100)} refunded to your wallet.`, "refund");
    } catch { /* best-effort */ }
  }
  revalidatePath("/app/bookings");
  revalidatePath("/app/wallet");
  revalidatePath(`/app/bookings/${reference}`);
  redirect(isPaid ? "/app/wallet" : "/app/bookings");
}

/**
 * Pays for a booking entirely from the customer's wallet balance (referral
 * earnings + cancellation credits). Only offered when the balance covers the
 * full total. Overdraw-protected with a user-row lock under SERIALIZABLE, and
 * idempotent (a second call on an already-paid booking is a no-op). Earns the
 * referral reward like a card payment, then assigns a cleaner. On failure it
 * redirects back to the pay page with an error message.
 */
export async function payWithWalletAction(reference: string): Promise<void> {
  const user = await assertRole("CUSTOMER");
  const settings = await getSettings();

  let errorMsg: string | undefined;
  let attempt = 0;
  for (;;) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Lock the wallet owner (overdraw) and the booking (idempotency).
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
          await tx.$queryRaw`SELECT id FROM "Booking" WHERE reference = ${reference} FOR UPDATE`;
          const b = await tx.booking.findUnique({ where: { reference }, include: { payment: true, referral: true } });
          if (!b || b.customerId !== user.id) return { error: "Booking not found." };
          if (b.paymentStatus === "PAID") return { ok: true as const }; // already paid
          if (b.status === "CANCELLED") return { error: "This booking was cancelled." };

          const txns = await tx.walletTransaction.findMany({ where: { userId: user.id } });
          const available = txns.reduce((s, t) => (t.status === "EARNED" || t.status === "PAID" ? s + t.amountCents : s), 0);
          if (available < b.totalCents) {
            return { error: `Your wallet balance (R${Math.round(available / 100)}) doesn't cover this R${Math.round(b.totalCents / 100)} booking.` };
          }

          await appendLedger(tx, { userId: user.id, type: "ADJUSTMENT", amountCents: -b.totalCents, status: "PAID", ref: `Booking payment · ${b.reference}` });
          await tx.booking.update({ where: { id: b.id }, data: { paymentStatus: "PAID" } });
          await tx.paymentTransaction.update({ where: { bookingId: b.id }, data: { status: "PAID", providerRef: `WALLET-${b.reference}` } });

          // First paid booking earns the referrer their reward (same as a card pay).
          if (b.referral && b.referral.status === "PENDING" && b.isFirstBooking) {
            await tx.referral.update({ where: { id: b.referral.id }, data: { status: "EARNED", rewardCents: settings.referrerRewardCents, bookingId: b.id, earnedAt: new Date() } });
            await appendLedger(tx, { userId: b.referral.referrerId, type: "REFERRAL_REWARD", amountCents: settings.referrerRewardCents, status: "EARNED", ref: `Referral · booking ${b.reference}` });
          }
          return { ok: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if ("error" in result && result.error) errorMsg = result.error;
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 3) {
        attempt += 1;
        continue;
      }
      throw e;
    }
  }

  if (errorMsg) redirect(`/app/pay/${reference}?wallet_error=${encodeURIComponent(errorMsg)}`);

  try {
    await assignHelper(reference);
  } catch {
    /* helper assigned later */
  }
  await audit({ actorId: user.id, action: "booking.paid", entity: "Booking", entityId: reference, meta: { method: "wallet" } });
  redirect(`/app/bookings/${reference}?paid=1`);
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
