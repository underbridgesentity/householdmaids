import crypto from "crypto";

/** Human-friendly, collision-resistant references for bookings / payouts. */
export function bookingReference(): string {
  return "HM-" + randomDigits(5);
}

export function payoutReference(): string {
  return "PO-" + randomDigits(4);
}

function randomDigits(n: number): string {
  let out = "";
  while (out.length < n) {
    out += crypto.randomInt(0, 10).toString();
  }
  return out;
}

/** Builds a referral code from a name + short random tail, e.g. THANDI-4821. */
export function referralCodeFor(name: string): string {
  const first = name.trim().split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) || "FRIEND";
  return `${first}-${randomDigits(4)}`;
}
