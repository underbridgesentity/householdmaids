/**
 * Money helpers. The platform stores all amounts as integer cents (ZAR).
 * Never use floats for money math.
 */

export function formatZar(cents: number): string {
  return "R" + Math.round(cents / 100).toLocaleString("en-ZA");
}

/** Formats with decimals, e.g. R1,234.50 — used on statements/receipts. */
export function formatZarExact(cents: number): string {
  return (
    "R" +
    (cents / 100).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function randsToCents(rands: number): number {
  return Math.round(rands * 100);
}
