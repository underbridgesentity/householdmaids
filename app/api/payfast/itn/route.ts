import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payfastConfig, verifyItnSignature, validateItnWithPayfast } from "@/lib/payfast";
import { markBookingPaid } from "@/lib/booking";
import { audit } from "@/lib/audit";

/**
 * Payfast Instant Transaction Notification (server-to-server). We NEVER trust a
 * browser return URL to finalise payment. Each ITN must pass, in order:
 *   1. signature check   (params weren't tampered with — needs our secret passphrase)
 *   2. server validation (Payfast itself confirms it really sent this transaction)
 *   3. amount match      (paid amount == booking total)
 * Only then do we mark the booking paid and earn any referral reward.
 *
 * NB: there is intentionally NO Referer/Host "source" check. Payfast's ITN is a
 * server-to-server POST with no Referer, and the request Host is always our own
 * domain, so such a check rejects every legitimate ITN. Authenticity is proven
 * by the signature (secret passphrase) + the server-to-server validate below.
 */
export async function POST(req: Request) {
  const cfg = payfastConfig();
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;
  const reject = async (reason: string, meta: Record<string, unknown> = {}, status = 400) => {
    console.error(`[payfast.itn] rejected: ${reason}`, { m: params.m_payment_id, ...meta });
    await audit({ action: "payfast.itn.rejected", entity: "Payment", meta: { reason, m: params.m_payment_id, ...meta } });
    return new NextResponse(reason, { status });
  };

  // 1. signature
  if (!verifyItnSignature(params, cfg.passphrase)) {
    return reject("bad_signature");
  }

  // 2. server-to-server validation (the authoritative proof of origin)
  if (!(await validateItnWithPayfast(cfg, rawBody))) {
    return reject("not_validated");
  }

  const reference = params.m_payment_id;
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) return reject("unknown_booking", {}, 404);

  // 3. amount match (Payfast sends rands with 2 decimals)
  const paidCents = Math.round(parseFloat(params.amount_gross ?? "0") * 100);
  if (paidCents !== booking.totalCents) {
    return reject("amount_mismatch", { paidCents, expected: booking.totalCents });
  }

  if (params.payment_status === "COMPLETE") {
    await markBookingPaid(reference, params.pf_payment_id);
    console.log(`[payfast.itn] booking ${reference} marked paid`);
  }

  return new NextResponse("OK", { status: 200 });
}
