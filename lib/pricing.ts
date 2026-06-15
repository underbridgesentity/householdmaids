import type { PlatformSettings, Service } from "@prisma/client";

/**
 * Server-authoritative pricing. Ported from the prototype price() function.
 * All inputs/outputs are integer cents. The client estimate is display-only;
 * the server always recomputes this at booking creation and at payment.
 */

export type Recurrence = "ONCE" | "WEEKLY" | "BIWEEKLY";

export interface PriceInput {
  service: Pick<Service, "mode" | "basePrice" | "hourlyRate" | "minHours">;
  beds: number;
  baths: number;
  hours: number;
  addonCents: number[]; // price of each selected add-on
  recurrence: Recurrence;
  applyReferralDiscount: boolean; // only valid on a first booking with a code
  settings: Pick<
    PlatformSettings,
    | "perBedroomCents"
    | "perBathroomCents"
    | "weeklyDiscountPct"
    | "biweeklyDiscountPct"
    | "firstBookingDiscountCents"
    | "extrasMinimumCents"
  >;
}

export interface PriceBreakdown {
  baseCents: number;
  addonsCents: number;
  subtotalCents: number;
  recurringDiscountCents: number;
  referralDiscountCents: number;
  totalCents: number;
}

export function computePrice(input: PriceInput): PriceBreakdown {
  const { service, settings } = input;

  const addonsCents = input.addonCents.reduce((t, c) => t + c, 0);

  let baseCents: number;
  if (service.mode === "ROOMS") {
    baseCents =
      service.basePrice +
      Math.max(0, input.beds) * settings.perBedroomCents +
      Math.max(0, input.baths) * settings.perBathroomCents;
  } else if (service.mode === "EXTRAS") {
    // Extras-only: priced from the chosen add-ons, topped up to the call-out
    // minimum when the add-ons alone fall below it (the "base" is that top-up).
    baseCents = Math.max(0, settings.extrasMinimumCents - addonsCents);
  } else {
    baseCents = Math.max(input.hours, service.minHours) * service.hourlyRate;
  }

  const subtotalCents = baseCents + addonsCents;

  // Round the percentage discount to a whole rand so the displayed total always
  // matches the amount actually charged (no stray cents from e.g. 15% of R570).
  const roundToRand = (cents: number) => Math.round(cents / 100) * 100;
  let recurringDiscountCents = 0;
  if (input.recurrence === "WEEKLY") {
    recurringDiscountCents = roundToRand((subtotalCents * settings.weeklyDiscountPct) / 100);
  } else if (input.recurrence === "BIWEEKLY") {
    recurringDiscountCents = roundToRand((subtotalCents * settings.biweeklyDiscountPct) / 100);
  }

  const referralDiscountCents = input.applyReferralDiscount
    ? settings.firstBookingDiscountCents
    : 0;

  const totalCents = Math.max(
    0,
    subtotalCents - recurringDiscountCents - referralDiscountCents,
  );

  return {
    baseCents,
    addonsCents,
    subtotalCents,
    recurringDiscountCents,
    referralDiscountCents,
    totalCents,
  };
}

/** "from" price shown on service cards (1 bed + 1 bath, minHours, or extras min). */
export function fromPriceCents(
  service: Pick<Service, "mode" | "basePrice" | "hourlyRate" | "minHours">,
  settings: Pick<PlatformSettings, "perBedroomCents" | "perBathroomCents" | "extrasMinimumCents">,
): number {
  if (service.mode === "ROOMS") {
    return service.basePrice + settings.perBedroomCents + settings.perBathroomCents;
  }
  if (service.mode === "EXTRAS") {
    return settings.extrasMinimumCents;
  }
  return Math.max(1, service.minHours) * service.hourlyRate;
}
