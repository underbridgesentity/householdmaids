import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payfastConfig, verifyItnSignature, validateItnWithPayfast, PAYFAST_VALID_HOSTS } from "@/lib/payfast";
import { markBookingPaid } from "@/lib/booking";
import { audit } from "@/lib/audit";

/**
 * Payfast Instant Transaction Notification (server-to-server). We NEVER trust a
 * browser return URL to finalise payment. Each ITN must pass, in order:
 *   1. signature check         (params weren't tampered with)
 *   2. source host check       (came from a Payfast server)
 *   3. server validation       (Payfast confirms it really sent this)
 *   4. amount match            (paid amount == booking total)
 * Only then do we mark the booking paid and earn any referral reward.
 */
export async function POST(req: Request) {
  const cfg = payfastConfig();
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;

  // 1. signature
  if (!verifyItnSignature(params, cfg.passphrase)) {
    await audit({ action: "payfast.itn.rejected", entity: "Payment", meta: { reason: "bad_signature", m: params.m_payment_id } });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // 2. source host. Fail closed in production; only the sandbox (where the host
  //    legitimately varies) skips this. Match the referer host exactly rather
  //    than a spoofable substring. The authoritative check is still the
  //    server-to-server validation in step 3.
  if (!cfg.sandbox) {
    let refererHost = "";
    try {
      refererHost = new URL(req.headers.get("referer") ?? "").host;
    } catch {
      /* no/invalid referer */
    }
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const fromPayfast = PAYFAST_VALID_HOSTS.includes(refererHost) || PAYFAST_VALID_HOSTS.includes(host);
    if (!fromPayfast) {
      await audit({ action: "payfast.itn.rejected", entity: "Payment", meta: { reason: "bad_source", refererHost } });
      return new NextResponse("Bad source", { status: 400 });
    }
  }

  // 3. server-to-server validation
  const valid = await validateItnWithPayfast(cfg, rawBody);
  if (!valid) {
    await audit({ action: "payfast.itn.rejected", entity: "Payment", meta: { reason: "not_validated" } });
    return new NextResponse("Not validated", { status: 400 });
  }

  const reference = params.m_payment_id;
  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) return new NextResponse("Unknown booking", { status: 404 });

  // 4. amount match (Payfast sends rands with 2 decimals)
  const paidCents = Math.round(parseFloat(params.amount_gross ?? "0") * 100);
  if (paidCents !== booking.totalCents) {
    await audit({ action: "payfast.itn.rejected", entity: "Payment", entityId: booking.id, meta: { reason: "amount_mismatch", paidCents, expected: booking.totalCents } });
    return new NextResponse("Amount mismatch", { status: 400 });
  }

  if (params.payment_status === "COMPLETE") {
    await markBookingPaid(reference, params.pf_payment_id);
  }

  return new NextResponse("OK", { status: 200 });
}
