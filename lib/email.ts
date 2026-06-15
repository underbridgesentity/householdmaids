/**
 * Email adapter. Delivery path, in order of preference:
 *   1. Resend HTTP API   — when RESEND_API_KEY is set (recommended on Vercel;
 *      no SMTP connection per invocation, best deliverability diagnostics).
 *   2. SMTP (nodemailer) — when SMTP_HOST is set (any provider's SMTP).
 *   3. Dev console        — logs the message in development.
 *
 * Set EMAIL_FROM to an address on your Resend-verified domain, e.g.
 *   EMAIL_FROM="Household Maids <noreply@householdmaids.co.za>"
 */

const from = process.env.EMAIL_FROM ?? "Household Maids <noreply@householdmaids.co.za>";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const html = msg.html ?? wrapHtml(msg.text);

  // 1. Resend HTTP API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, html }),
    });
    if (!res.ok) {
      // Surface the provider error so callers/logs can see why mail didn't send.
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    return;
  }

  // 2. SMTP (any provider)
  const host = process.env.SMTP_HOST;
  if (host) {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html });
    return;
  }

  // 3. Dev console
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email:dev] → ${msg.to}\n  ${msg.subject}\n  ${msg.text}`);
  }
}

/**
 * Welcome email sent when a customer account is created (signup or guest
 * checkout). Best-effort: callers should not block account creation on it.
 */
export async function sendWelcomeEmail(opts: { to: string; fullName: string }): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://householdmaids.vercel.app";
  const first = opts.fullName.trim().split(" ")[0] || "there";
  const text = [
    `Hi ${first},`,
    `Welcome to Household Maids! Your account is ready.`,
    `You can now book trusted, vetted cleaners across Gauteng in under a minute, track your cleans, and earn R50 every time a friend books with your referral link.`,
    `Book your first clean: ${base}/book`,
    `Your wallet & referral link: ${base}/app/wallet`,
    `Need a hand? Reply to this email or message us on WhatsApp at 062 032 4931.`,
    `The Household Maids team`,
  ].join("\n\n");
  await sendEmail({ to: opts.to, subject: "Welcome to Household Maids", text });
}

function wrapHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;color:#201F4D;line-height:1.6">${text
    .split("\n")
    .map((l) => `<p>${l}</p>`)
    .join("")}</div>`;
}
