/**
 * Email adapter. Sends via SMTP (nodemailer) when SMTP_* env vars are set,
 * otherwise logs to the console in dev. Swap in any transactional provider by
 * setting the SMTP_* vars (e.g. Resend/SendGrid/Mailgun SMTP).
 */

const from = process.env.EMAIL_FROM ?? "Household Maids <no-reply@householdmaids.co.za>";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] → ${msg.to}\n  ${msg.subject}\n  ${msg.text}`);
    }
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html ?? wrapHtml(msg.text) });
}

function wrapHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;color:#201F4D;line-height:1.6">${text
    .split("\n")
    .map((l) => `<p>${l}</p>`)
    .join("")}</div>`;
}
