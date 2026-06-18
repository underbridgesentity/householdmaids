import type { Prisma } from "@prisma/client";
import { signToken } from "@/lib/crypto";

/**
 * Newsletter / email-marketing helpers. Audiences are customer segments
 * resolved at send time; anyone who has opted out (marketingOptOut) is always
 * excluded. Delivery goes through Resend's batch API with a per-recipient,
 * signed unsubscribe link (POPIA / anti-spam requirement).
 */

export type SegmentKey = "all" | "paid" | "booked" | "never_booked" | "lapsed" | "referred";

export const SEGMENTS: { key: SegmentKey; label: string; help: string }[] = [
  { key: "all", label: "All customers", help: "Everyone who hasn't opted out" },
  { key: "paid", label: "Paying customers", help: "Have at least one paid booking" },
  { key: "booked", label: "Have booked", help: "Started at least one booking" },
  { key: "never_booked", label: "Signed up, never booked", help: "Account created, no bookings" },
  { key: "lapsed", label: "Lapsed (60+ days)", help: "Booked before, nothing in 60 days" },
  { key: "referred", label: "Joined via referral", help: "Signed up with a referral code" },
];

export function isSegment(v: string | undefined): v is SegmentKey {
  return !!v && SEGMENTS.some((s) => s.key === v);
}

/** Prisma filter for a segment. Always scoped to opted-in customers. */
export function segmentWhere(key: SegmentKey): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: "CUSTOMER", marketingOptOut: false };
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  switch (key) {
    case "paid": return { ...base, bookings: { some: { paymentStatus: "PAID" } } };
    case "booked": return { ...base, bookings: { some: {} } };
    case "never_booked": return { ...base, bookings: { none: {} } };
    case "lapsed": return { ...base, bookings: { some: {} }, NOT: { bookings: { some: { createdAt: { gte: cutoff } } } } };
    case "referred": return { ...base, referredBy: { isNot: null } };
    case "all":
    default: return base;
  }
}

const FROM = process.env.EMAIL_FROM ?? "Household Maids <noreply@householdmaids.co.za>";
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://householdmaids.vercel.app";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function unsubscribeUrl(userId: string): string {
  return `${BASE}/unsubscribe/${signToken(userId)}`;
}

function renderHtml(fullName: string, body: string, unsubUrl: string): string {
  const first = (fullName.trim().split(" ")[0] || "there");
  const paras = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:8px 4px;color:#201F4D;font-size:15px">
    <p style="margin:0 0 16px">Hi ${escapeHtml(first)},</p>
    ${paras}
    <p style="color:#8a7fa6;margin:24px 0 0">The Household Maids team</p>
    <hr style="border:none;border-top:1px solid #efe9f5;margin:24px 0 12px">
    <p style="font-size:12px;color:#a99fbe;line-height:1.5">You're receiving this because you have a Household Maids account.
    <a href="${unsubUrl}" style="color:#A22D8F">Unsubscribe</a> from marketing emails.</p>
  </div>`;
}

function renderText(fullName: string, body: string, unsubUrl: string): string {
  const first = (fullName.trim().split(" ")[0] || "there");
  return `Hi ${first},\n\n${body}\n\nThe Household Maids team\n\n—\nYou're receiving this because you have a Household Maids account. Unsubscribe: ${unsubUrl}`;
}

export interface Recipient { id: string; email: string; fullName: string }

/**
 * Sends a campaign to recipients via Resend's batch endpoint (100 per call).
 * Without RESEND_API_KEY (dev) it logs and reports a simulated success so the
 * flow is testable. Returns delivered / failed counts.
 */
export async function deliverCampaign(subject: string, body: string, recipients: Recipient[]): Promise<{ sent: number; failed: number }> {
  const messages = recipients.map((r) => {
    const unsub = unsubscribeUrl(r.id);
    return { from: FROM, to: r.email, subject, html: renderHtml(r.fullName, body, unsub), text: renderText(r.fullName, body, unsub) };
  });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.log(`[marketing:dev] simulated send of "${subject}" to ${messages.length} recipients`);
    return { sent: messages.length, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }
  return { sent, failed };
}
