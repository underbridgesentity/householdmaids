import { z } from "zod";

/** Shared Zod schemas. Every server mutation validates input through these. */

export const signupSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  referralCode: z.string().max(32).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const recurrenceSchema = z.enum(["ONCE", "WEEKLY", "BIWEEKLY"]);

export const bookingSchema = z.object({
  serviceId: z.string().min(1),
  areaId: z.string().min(1),
  addressText: z.string().min(3).max(160),
  beds: z.coerce.number().int().min(0).max(12),
  baths: z.coerce.number().int().min(0).max(10),
  hours: z.coerce.number().int().min(0).max(12),
  addonIds: z.array(z.string()).max(12).default([]),
  recurrence: recurrenceSchema,
  scheduledAt: z.coerce.date(),
  applyReferral: z.coerce.boolean().default(false),
});

export const withdrawSchema = z.object({
  amountCents: z.coerce.number().int().min(1),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  note: z.string().max(500).optional().or(z.literal("")),
  tags: z.array(z.string().max(24)).max(6).default([]),
});

export const messageSchema = z.object({
  bookingId: z.string().min(1),
  body: z.string().min(1).max(1000),
});

export const helperApplicationSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(20),
  password: z.string().min(8).max(100),
  idNumber: z.string().min(6).max(20),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  areaIds: z.array(z.string()).min(1).max(15),
  bank: z.string().min(2).max(60),
  accountNumber: z.string().min(4).max(30),
  accountType: z.string().min(2).max(30),
  clearanceConsent: z.coerce.boolean(),
});

export const serviceUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(60),
  description: z.string().min(2).max(120),
  emoji: z.string().min(1).max(8),
  mode: z.enum(["ROOMS", "HOURS"]),
  basePriceRands: z.coerce.number().min(0).max(100000),
  hourlyRateRands: z.coerce.number().min(0).max(100000),
  minHours: z.coerce.number().int().min(1).max(12),
  active: z.coerce.boolean(),
});

export const settingsSchema = z.object({
  referrerRewardRands: z.coerce.number().min(0).max(5000),
  firstBookingDiscountRands: z.coerce.number().min(0).max(5000),
  weeklyDiscountPct: z.coerce.number().int().min(0).max(100),
  biweeklyDiscountPct: z.coerce.number().int().min(0).max(100),
  perBedroomRands: z.coerce.number().min(0).max(5000),
  perBathroomRands: z.coerce.number().min(0).max(5000),
});
