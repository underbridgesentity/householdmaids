/**
 * Payout adapter. Payfast is inbound-only, so outbound referral/helper payouts
 * use a swappable adapter. The default produces a bank-batch CSV for the admin
 * Friday run; an automated transfer provider can be dropped in later without
 * changing callers.
 */

export interface PayoutInstruction {
  reference: string;
  beneficiaryName: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  amountCents: number;
}

export interface PayoutAdapter {
  /** Returns a provider reference / batch id for the processed payouts. */
  process(instructions: PayoutInstruction[]): Promise<{ batchRef: string; csv: string }>;
}

/** Generates a bank-importable CSV. */
export const bankBatchAdapter: PayoutAdapter = {
  async process(instructions) {
    const header = "Reference,Beneficiary,Bank,AccountNumber,AccountType,Amount(ZAR)";
    const rows = instructions.map((i) =>
      [
        i.reference,
        i.beneficiaryName,
        i.bank,
        i.accountNumber,
        i.accountType,
        (i.amountCents / 100).toFixed(2),
      ].map(csvSafe).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const batchRef = "BATCH-" + instructions.length + "-" + instructions.reduce((t, i) => t + i.amountCents, 0);
    return { batchRef, csv };
  },
};

/** Quote-escapes a CSV field AND neutralises spreadsheet formula injection. */
export function csvSafe(value: string | number): string {
  let s = String(value);
  // A leading = + - @ (or control chars) makes Excel/Sheets execute it as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function getPayoutAdapter(): PayoutAdapter {
  // Future: switch on env (e.g. PAYOUT_PROVIDER) to an automated transfer impl.
  return bankBatchAdapter;
}
