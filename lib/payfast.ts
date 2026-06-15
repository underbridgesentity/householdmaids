import crypto from "crypto";

/**
 * Payfast adapter (https://developers.payfast.co.za).
 * Inbound payments only: we build a signed redirect to Payfast's hosted
 * checkout, then verify the server-to-server ITN callback before trusting it.
 */

export interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  sandbox: boolean;
}

export function payfastConfig(): PayfastConfig {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID ?? "",
    merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "",
    passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
    sandbox: process.env.PAYFAST_SANDBOX !== "false",
  };
}

export function payfastProcessUrl(cfg: PayfastConfig): string {
  return cfg.sandbox
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";
}

function payfastValidateUrl(cfg: PayfastConfig): string {
  return cfg.sandbox
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate";
}

// Payfast encodes spaces as '+' and uses uppercase percent-encoding.
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** Builds the MD5 signature over name=value pairs, in insertion order. */
export function signPayfast(data: Record<string, string>, passphrase: string): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "signature") continue;
    if (value === undefined || value === null || value === "") continue;
    pairs.push(`${key}=${pfEncode(String(value))}`);
  }
  let base = pairs.join("&");
  if (passphrase) base += `&passphrase=${pfEncode(passphrase)}`;
  return crypto.createHash("md5").update(base).digest("hex");
}

export interface CheckoutParams {
  amountCents: number;
  itemName: string;
  mPaymentId: string; // our booking reference
  email: string;
  name: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

// Payfast text fields must be plain ASCII without '&' (which would split the
// signature string). Strip anything outside printable ASCII and neutralise '&'.
function pfText(value: string, max = 100): string {
  return value
    .replace(/&/g, "and")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Builds the ordered field set (incl. signature) to POST to Payfast. */
export function buildCheckoutFields(cfg: PayfastConfig, p: CheckoutParams): Record<string, string> {
  const [firstName, ...rest] = pfText(p.name, 100).split(" ");
  const fields: Record<string, string> = {
    merchant_id: cfg.merchantId,
    merchant_key: cfg.merchantKey,
    return_url: p.returnUrl,
    cancel_url: p.cancelUrl,
    notify_url: p.notifyUrl,
    name_first: firstName || "Customer",
    name_last: rest.join(" ") || "",
    email_address: p.email,
    m_payment_id: p.mPaymentId,
    amount: (p.amountCents / 100).toFixed(2),
    item_name: pfText(p.itemName, 100) || "Household Maids booking",
  };
  fields.signature = signPayfast(fields, cfg.passphrase);
  return fields;
}

/** Verifies an ITN payload's signature matches what we'd compute. */
export function verifyItnSignature(
  data: Record<string, string>,
  passphrase: string,
): boolean {
  const received = data.signature;
  if (!received) return false;
  const computed = signPayfast(data, passphrase);
  const a = Buffer.from(received);
  const b = Buffer.from(computed);
  // timingSafeEqual throws on length mismatch — guard so a malformed signature
  // is rejected (false) rather than crashing the webhook.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Server-to-server confirmation that Payfast really sent this ITN. */
export async function validateItnWithPayfast(
  cfg: PayfastConfig,
  rawBody: string,
): Promise<boolean> {
  try {
    const res = await fetch(payfastValidateUrl(cfg), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBody,
    });
    const text = (await res.text()).trim();
    return text === "VALID";
  } catch {
    return false;
  }
}

export const PAYFAST_VALID_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];
