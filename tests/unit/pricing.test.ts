import { describe, it, expect } from "vitest";
import { computePrice, fromPriceCents } from "@/lib/pricing";

const settings = {
  perBedroomCents: 9000,
  perBathroomCents: 7000,
  weeklyDiscountPct: 15,
  biweeklyDiscountPct: 10,
  firstBookingDiscountCents: 7500,
  extrasMinimumCents: 15000,
};
const roomsService = { mode: "ROOMS" as const, basePrice: 32000, hourlyRate: 0, minHours: 1 };
const hoursService = { mode: "HOURS" as const, basePrice: 0, hourlyRate: 15000, minHours: 3 };
const extrasService = { mode: "EXTRAS" as const, basePrice: 0, hourlyRate: 0, minHours: 1 };

describe("computePrice — rooms", () => {
  it("adds per-bedroom and per-bathroom rates to the base", () => {
    const p = computePrice({ service: roomsService, beds: 2, baths: 1, hours: 0, addonCents: [], recurrence: "ONCE", applyReferralDiscount: false, settings });
    // 32000 + 2*9000 + 1*7000 = 57000
    expect(p.baseCents).toBe(57000);
    expect(p.totalCents).toBe(57000);
  });

  it("applies add-ons", () => {
    const p = computePrice({ service: roomsService, beds: 1, baths: 1, hours: 0, addonCents: [9000, 8000], recurrence: "ONCE", applyReferralDiscount: false, settings });
    expect(p.addonsCents).toBe(17000);
    expect(p.subtotalCents).toBe(48000 + 17000);
  });

  it("applies the weekly recurring discount (15%), rounded to a whole rand", () => {
    const p = computePrice({ service: roomsService, beds: 2, baths: 1, hours: 0, addonCents: [], recurrence: "WEEKLY", applyReferralDiscount: false, settings });
    // 15% of R570 = R85.50 → rounded to R86 so the charged total has no stray cents
    expect(p.recurringDiscountCents).toBe(8600);
    expect(p.totalCents).toBe(57000 - 8600);
  });

  it("applies the referral first-booking discount", () => {
    const p = computePrice({ service: roomsService, beds: 2, baths: 1, hours: 0, addonCents: [], recurrence: "ONCE", applyReferralDiscount: true, settings });
    expect(p.referralDiscountCents).toBe(7500);
    expect(p.totalCents).toBe(57000 - 7500);
  });

  it("stacks recurring + referral discounts and never goes below zero", () => {
    const cheap = { mode: "ROOMS" as const, basePrice: 1000, hourlyRate: 0, minHours: 1 };
    const p = computePrice({ service: cheap, beds: 0, baths: 0, hours: 0, addonCents: [], recurrence: "WEEKLY", applyReferralDiscount: true, settings });
    expect(p.totalCents).toBe(0); // 1000 - 150 - 7500 clamped to 0
  });
});

describe("computePrice — hours", () => {
  it("bills max(hours, minHours) * hourlyRate", () => {
    const p = computePrice({ service: hoursService, beds: 0, baths: 0, hours: 2, addonCents: [], recurrence: "ONCE", applyReferralDiscount: false, settings });
    expect(p.baseCents).toBe(3 * 15000); // 2 < minHours 3 → 3 hours
  });
  it("uses the requested hours when above the minimum", () => {
    const p = computePrice({ service: hoursService, beds: 0, baths: 0, hours: 5, addonCents: [], recurrence: "ONCE", applyReferralDiscount: false, settings });
    expect(p.baseCents).toBe(5 * 15000);
  });
});

describe("computePrice — extras only", () => {
  it("tops up to the call-out minimum when chosen extras fall below it", () => {
    // One R90 extra, below the R150 minimum → R60 call-out top-up as base.
    const p = computePrice({ service: extrasService, beds: 0, baths: 0, hours: 0, addonCents: [9000], recurrence: "ONCE", applyReferralDiscount: false, settings });
    expect(p.addonsCents).toBe(9000);
    expect(p.baseCents).toBe(6000); // 15000 - 9000
    expect(p.subtotalCents).toBe(15000);
    expect(p.totalCents).toBe(15000);
  });

  it("charges the extras total with no top-up once it clears the minimum", () => {
    const p = computePrice({ service: extrasService, beds: 0, baths: 0, hours: 0, addonCents: [9000, 8000], recurrence: "ONCE", applyReferralDiscount: false, settings });
    expect(p.addonsCents).toBe(17000);
    expect(p.baseCents).toBe(0); // already above the R150 minimum
    expect(p.totalCents).toBe(17000);
  });
});

describe("fromPriceCents", () => {
  it("rooms = base + one bedroom + one bathroom", () => {
    expect(fromPriceCents(roomsService, settings)).toBe(32000 + 9000 + 7000);
  });
  it("hours = minHours * hourlyRate", () => {
    expect(fromPriceCents(hoursService, settings)).toBe(3 * 15000);
  });
  it("extras = the call-out minimum", () => {
    expect(fromPriceCents(extrasService, settings)).toBe(15000);
  });
});
