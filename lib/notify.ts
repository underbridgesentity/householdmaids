import { prisma } from "@/lib/db";

/**
 * Notification adapter. In-app notifications are persisted; email/SMS/push are
 * routed through a sink that's a no-op console logger in dev. Drop in SMTP /
 * Twilio / web-push later by implementing ChannelSink.
 */

export interface ChannelSink {
  send(to: string, title: string, body: string): Promise<void>;
}

const consoleSink: ChannelSink = {
  async send(to, title, body) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[notify] → ${to}: ${title} — ${body}`);
    }
  },
};

export async function notifyUser(userId: string, title: string, body: string): Promise<void> {
  await prisma.notification.create({ data: { userId, title, body } });
}

export async function sendEmail(to: string, title: string, body: string): Promise<void> {
  await consoleSink.send(to, title, body);
}

/**
 * Records an email sent to a customer so the admin has a per-customer
 * communication trail. Best-effort: a logging failure must never break the
 * underlying action (the email itself already went out).
 */
export async function logCustomerEmail(userId: string, subject: string, body: string, kind: string): Promise<void> {
  try {
    await prisma.communicationLog.create({ data: { userId, subject, body, kind } });
  } catch {
    /* non-critical */
  }
}
