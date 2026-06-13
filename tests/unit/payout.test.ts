import { describe, it, expect } from "vitest";
import { bankBatchAdapter } from "@/lib/payout";
import { formatZar, formatZarExact, randsToCents } from "@/lib/money";

describe("bankBatchAdapter", () => {
  it("builds a CSV with a header and one row per instruction", async () => {
    const { csv, batchRef } = await bankBatchAdapter.process([
      { reference: "PO-1", beneficiaryName: "Thandi Mokoena", bank: "FNB", accountNumber: "62534887901", accountType: "Cheque", amountCents: 25000 },
      { reference: "PO-2", beneficiaryName: "Bongani, Jr", bank: "Capitec", accountNumber: "12345678", accountType: "Savings", amountCents: 15000 },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Reference");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("250.00");
    // name with a comma must be quoted
    expect(lines[2]).toContain('"Bongani, Jr"');
    expect(batchRef).toContain("BATCH-2");
  });
});

describe("money helpers", () => {
  it("formats cents as whole rands", () => {
    expect(formatZar(57000)).toBe("R570");
    expect(formatZar(5000)).toBe("R50");
  });
  it("formats exact rands with decimals (en-ZA: space thousands, comma decimal)", () => {
    // en-ZA renders 1234.50 as "1 234,50"; assert structure, not a fixed separator byte.
    expect(formatZarExact(123450)).toMatch(/^R1.234,50$/);
  });
  it("converts rands to integer cents", () => {
    expect(randsToCents(49.5)).toBe(4950);
  });
});
