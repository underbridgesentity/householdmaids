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

function wrapHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;color:#201F4D;line-height:1.6">${text
    .split("\n")
    .map((l) => `<p>${l}</p>`)
    .join("")}</div>`;
}
